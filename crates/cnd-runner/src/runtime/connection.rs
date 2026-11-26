//! Connection loop with private service jobs outside ordinary idle accounting.

use tokio::sync::watch;
use tokio::task::JoinSet;

use crate::error::Result;
use crate::link::ports::LinkUpdate;
use crate::relocation::{RepositoryTarget, check_move, requested_move};
use crate::services::tasks::ServiceTasks;
use crate::update::IdleUpdate;

use super::{RunExit, RunnerCore};

impl RunnerCore {
    pub(super) async fn connected(
        &self,
        shutdown: &mut watch::Receiver<bool>,
        jobs: &mut JoinSet<(u64, Result<()>)>,
        round: u64,
    ) -> Option<RunExit> {
        let mut services = ServiceTasks::default();
        let result = self
            .connected_inner(shutdown, jobs, round, &mut services)
            .await;
        services.close().await;
        result
    }

    async fn connected_inner(
        &self,
        shutdown: &mut watch::Receiver<bool>,
        jobs: &mut JoinSet<(u64, Result<()>)>,
        round: u64,
        services: &mut ServiceTasks,
    ) -> Option<RunExit> {
        let mut step = self.link.step();
        let mut check = self.clock.update_delay();
        let mut idle = IdleUpdate::default();
        let mut welcomed = false;
        let mut relocation: Option<RepositoryTarget> = None;
        loop {
            if let Some(target) = relocation.take() {
                match self.handler.working().await {
                    Ok(false) => return Some(RunExit::Relocate(target)),
                    Ok(true) => relocation = Some(target),
                    Err(_) => {
                        tracing::warn!("The runner could not check its turns before a move.");
                        relocation = Some(target);
                    }
                }
            }
            tokio::select! {
                biased;
                _ = async { let _ = shutdown.wait_for(|stopped| *stopped).await; } => return None,
                finished = jobs.join_next(), if !jobs.is_empty() => {
                    match finished {
                        Some(Ok((job_round, Err(_)))) => {
                            tracing::warn!("The runner command could not finish.");
                            if job_round == round {
                                drop(step);
                                services.close().await;
                                let _ = self.link.close().await;
                                return None;
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
                            if let Some(source) = &self.services
                                && let Some(connection) = self.link.service_connection().await {
                                services.connect(source.clone(), self.link.clone(), connection, self.clock.clone());
                            }
                            let connected = self.handler.connected();
                            jobs.spawn(async move { (round, connected.await) });
                        },
                        Ok(LinkUpdate::Command(command)) => {
                            idle.reset();
                            if let Some(request) = requested_move(&command) {
                                if let Some(target) = check_move(self.folders.as_ref(), self.link.as_ref(), request).await {
                                    relocation = Some(target);
                                }
                            } else if self.handler.command(*command).is_err() { tracing::warn!("The runner command could not finish."); }
                        },
                        Ok(LinkUpdate::Progress) => {},
                        Ok(LinkUpdate::ServiceCommand { connection, command }) => services.command(connection, command),
                        Ok(LinkUpdate::Disconnected) | Err(_) => return None,
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
                        Ok(true) => return Some(RunExit::Swap),
                        Ok(false) => {},
                        Err(error) => {
                            idle.reset();
                            tracing::warn!(%error, "The runner could not check its idle update.");
                        }
                    }
                },
                _ = self.clock.move_delay(), if relocation.is_some() => {},
                _ = services.finished(), if services.pending() => {},
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
