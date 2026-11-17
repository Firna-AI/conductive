//! Reconnect loop and command ownership without agent or repository work.

use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::runner_commands::RunnerCommand;
use futures_util::future::BoxFuture;
use tokio::sync::watch;
use tokio::task::JoinSet;

use crate::clock::Clock;
use crate::error::Result;
use crate::link::ports::{LinkUpdate, RunnerLink};
use crate::startup_log::StartupLog;
use crate::state::store::EventStore;
use crate::update::{IdleUpdate, ReleaseReadiness};

/// Why the runner completed its normal shutdown path.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RunExit {
    /// A shutdown signal or a closed shutdown channel stopped the runner.
    Shutdown,
    /// Idle work and local release readiness permit an in-place release change.
    Swap,
}

/// File and turn owners receive commands without blocking socket confirmations.
#[cfg_attr(test, unimock::unimock(api = CommandHandlerMock))]
#[async_trait]
pub trait CommandHandler: Send + Sync {
    /// Remove stale credentials and start offline report schedules before the first connection attempt.
    async fn start(&self) -> Result<()> {
        Ok(())
    }
    /// Reserve initial reports in wire order, then send runner.ready after they finish.
    fn connected(&self) -> BoxFuture<'static, Result<()>>;
    /// Queue one command in wire order. The handler owns its asynchronous work.
    fn command(&self, command: RunnerCommand) -> Result<()>;
    /// Report active turns, queued work, unfinished accepted turns, and report requests.
    async fn busy(&self) -> Result<bool>;
    /// End accepted live turns before the final persist and socket close.
    async fn shutdown(&self) -> Result<()>;
}

/// Long-running runner core, consumed through a trait object.
#[async_trait]
pub trait Runner: Send + Sync {
    /// Run until shutdown is true or its sender closes. Startup errors propagate.
    async fn run(&self, shutdown: watch::Receiver<bool>) -> Result<RunExit>;
}

/// Connection runtime. Repository scans and agents belong to injected handlers.
pub struct RunnerCore {
    link: Arc<dyn RunnerLink>,
    store: Arc<dyn EventStore>,
    clock: Arc<dyn Clock>,
    handler: Arc<dyn CommandHandler>,
    releases: Arc<dyn ReleaseReadiness>,
    startup_log: Option<Arc<dyn StartupLog>>,
}

impl RunnerCore {
    /// Compose a runtime from a loaded store and a saved-event link.
    pub fn new(
        link: Arc<dyn RunnerLink>,
        store: Arc<dyn EventStore>,
        clock: Arc<dyn Clock>,
        handler: Arc<dyn CommandHandler>,
        releases: Arc<dyn ReleaseReadiness>,
    ) -> Self {
        Self {
            link,
            store,
            clock,
            handler,
            releases,
            startup_log: None,
        }
    }

    /// Share the process startup measurements supplied by the composition root.
    pub fn with_startup_log(mut self, startup_log: Arc<dyn StartupLog>) -> Self {
        self.startup_log = Some(startup_log);
        self
    }

    async fn connected(
        &self,
        shutdown: &mut watch::Receiver<bool>,
        jobs: &mut JoinSet<(u64, Result<()>)>,
        round: u64,
    ) -> bool {
        let mut step = self.link.step();
        let mut check = self.clock.update_delay();
        let mut idle = IdleUpdate::default();
        let mut welcomed = false;
        loop {
            tokio::select! {
                biased;
                _ = async { let _ = shutdown.wait_for(|stopped| *stopped).await; } => return false,
                finished = jobs.join_next(), if !jobs.is_empty() => {
                    match finished {
                        Some(Ok((job_round, Err(_)))) => {
                            tracing::warn!("The runner command could not finish.");
                            if job_round == round {
                                drop(step);
                                let _ = self.link.close().await;
                                return false;
                            }
                        },
                        Some(Err(_)) => tracing::warn!("The runner command task could not finish."),
                        _ => {},
                    }
                },
                update = &mut step => {
                    match update {
                        Ok(LinkUpdate::Connected) => {
                            if let Some(log) = &self.startup_log { log.welcomed(); }
                            welcomed = true;
                            let connected = self.handler.connected();
                            jobs.spawn(async move { (round, connected.await) });
                        },
                        Ok(LinkUpdate::Command(command)) => {
                            idle.reset();
                            if self.handler.command(*command).is_err() { tracing::warn!("The runner command could not finish."); }
                        },
                        Ok(LinkUpdate::Progress) => {},
                        Ok(LinkUpdate::Disconnected) | Err(_) => return false,
                    }
                    step = self.link.step();
                },
                _ = &mut check => {
                    check = self.clock.update_delay();
                    if !welcomed || !jobs.is_empty() {
                        idle.reset();
                        continue;
                    }
                    match self.check_update(&mut idle).await {
                        Ok(true) => return true,
                        Ok(false) => {},
                        Err(error) => {
                            idle.reset();
                            tracing::warn!(%error, "The runner could not check its idle update.");
                        }
                    }
                },
            }
        }
    }

    async fn check_update(&self, idle: &mut IdleUpdate) -> Result<bool> {
        let busy = self.handler.busy().await?;
        let now = self.clock.monotonic();
        let release = self.releases.status()?;
        Ok(idle.observe(now, busy, release))
    }
}

#[async_trait]
impl Runner for RunnerCore {
    async fn run(&self, mut shutdown: watch::Receiver<bool>) -> Result<RunExit> {
        let now = self.clock.now()?;
        if self.store.recover(now).await.is_err() {
            self.store.persist().await?;
            self.store.recover(now).await?;
        }
        self.handler.start().await?;
        let mut jobs = JoinSet::new();
        let mut round = 0;
        let mut exit = RunExit::Shutdown;
        let mut swap_close = Ok(());
        while !*shutdown.borrow() && shutdown.has_changed().is_ok() {
            round += 1;
            let connected = tokio::select! {
                biased;
                _ = async { let _ = shutdown.wait_for(|stopped| *stopped).await; } => break,
                connected = self.link.connect() => connected,
            };
            if connected.is_ok() {
                if let Some(log) = &self.startup_log {
                    log.connected();
                }
                if self.connected(&mut shutdown, &mut jobs, round).await {
                    swap_close = self.link.close().await;
                    exit = RunExit::Swap;
                    break;
                }
            }
            if *shutdown.borrow() || shutdown.has_changed().is_err() {
                break;
            }
            tracing::warn!("The runner will retry its connection.");
            tokio::select! {
                biased;
                _ = async { let _ = shutdown.wait_for(|stopped| *stopped).await; } => {},
                _ = self.clock.reconnect_delay() => {},
            }
        }
        let ended = self.handler.shutdown().await;
        while let Some(job) = jobs.join_next().await {
            if !matches!(job, Ok((_, Ok(())))) {
                tracing::warn!("The runner command could not finish.");
            }
        }
        let saved = self.link.persist().await;
        let closed = self.link.close().await;
        ended?;
        saved?;
        closed?;
        swap_close?;
        Ok(exit)
    }
}

#[cfg(test)]
#[path = "_tests_/runtime_tests.rs"]
mod runtime_tests;

#[cfg(test)]
#[path = "_tests_/idle_runtime/mod.rs"]
mod idle_runtime;
