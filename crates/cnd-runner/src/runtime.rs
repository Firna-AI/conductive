//! Reconnect loop and command ownership without agent or repository work.

use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::runner_commands::RunnerCommand;
use futures_util::future::BoxFuture;
use tokio::sync::watch;
use tokio::task::JoinSet;

use crate::clock::Clock;
use crate::error::Result;
use crate::link::ports::RunnerLink;
use crate::relocation::{RepositoryFolders, RepositoryTarget};
use crate::services::ports::ServiceEffects;
use crate::startup_log::StartupLog;
use crate::state::store::EventStore;
use crate::update::ReleaseReadiness;

mod connection;

/// Why the runner completed its normal shutdown path.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum RunExit {
    /// A shutdown signal or a closed shutdown channel stopped the runner.
    Shutdown,
    /// Idle work and local release readiness permit an in-place release change.
    Swap,
    /// A repository move names another folder, and no turn runs.
    Relocate(RepositoryTarget),
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
    /// Report agent work only. A repository move waits for it, but not for reports.
    async fn working(&self) -> Result<bool> {
        self.busy().await
    }
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
    folders: Option<RepositoryFolders>,
    startup_log: Option<Arc<dyn StartupLog>>,
    services: Option<Arc<dyn ServiceEffects>>,
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
            folders: None,
            startup_log: None,
            services: None,
        }
    }

    /// Accept repository moves to these folders. Without them, each move is refused.
    pub fn with_folders(mut self, folders: RepositoryFolders) -> Self {
        self.folders = Some(folders);
        self
    }

    /// Share the process startup measurements supplied by the composition root.
    pub fn with_startup_log(mut self, startup_log: Arc<dyn StartupLog>) -> Self {
        self.startup_log = Some(startup_log);
        self
    }

    /// Compose private service work without adding ordinary busy or turn jobs.
    pub fn with_services(mut self, services: Arc<dyn ServiceEffects>) -> Self {
        self.services = Some(services);
        self
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
                if let Some(ended) = self.connected(&mut shutdown, &mut jobs, round).await {
                    swap_close = self.link.close().await;
                    exit = ended;
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
