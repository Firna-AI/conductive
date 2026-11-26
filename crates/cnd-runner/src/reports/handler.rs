//! Compose file, port, and skill reports with connection commands and repairs.

use std::collections::BTreeSet;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};

use async_trait::async_trait;
use cnd_runner_interface::file_tree::RunnerFileEvent;
use cnd_runner_interface::runner::{RunnerEvent, RunnerReady};
use cnd_runner_interface::runner_commands::{
    RunnerCommand, RunnerControlCommand, RunnerReportKind, RunnerReportRefresh,
};
use cnd_runner_interface::runner_handshake::RunnerToWorkspace;
use futures_util::future::BoxFuture;
use tokio::task::JoinHandle;

use crate::clock::Clock;
use crate::emitter::EventEmitter;
use crate::error::{Error, Result};
use crate::link::ports::RunnerLink;
use crate::ports::reporter::PortReports;
use crate::runtime::CommandHandler;
use crate::skills::boundary::SkillReports;
use crate::startup_log::StartupLog;
use crate::state::store::EventStore;
use crate::watcher::service::ReportWatches;

use super::files::{FileReportKind, FileReports};
use super::prepare::ReportFilter;

/// Dependencies supplied by the composition root. No agent command is interpreted here.
pub struct ReportDependencies {
    /// File scan and request owner.
    pub files: Arc<dyn FileReports>,
    /// Optional listening-port owner.
    pub ports: Option<Arc<dyn PortReports>>,
    /// Optional skill discovery and report owner.
    pub skills: Option<Arc<dyn SkillReports>>,
    /// Event output policy shared with the turn owner.
    pub emitter: Arc<dyn EventEmitter>,
    /// Saved connection for unnumbered file replies and retained report replay.
    pub link: Arc<dyn RunnerLink>,
    /// Loaded durable event state.
    pub store: Arc<dyn EventStore>,
    /// Event timestamps.
    pub clock: Arc<dyn Clock>,
    /// Complete-source credential filter.
    pub filter: Arc<dyn ReportFilter>,
    /// Native watch and restore-marker owner, when enabled.
    pub watches: Option<Arc<dyn ReportWatches>>,
    /// Agent command and live-turn shutdown owner.
    pub next: Arc<dyn CommandHandler>,
}

/// Report command handler. Work starts synchronously in wire order, then runs independently.
pub struct ReportCommandHandler {
    dependencies: Arc<ReportDependencies>,
    seen: Mutex<BTreeSet<String>>,
    jobs: Mutex<Vec<JoinHandle<()>>>,
    stopped: Arc<AtomicBool>,
    initial: Arc<AtomicUsize>,
    startup_log: Option<Arc<dyn StartupLog>>,
}

struct InitialReport(Arc<AtomicUsize>);

impl Drop for InitialReport {
    fn drop(&mut self) {
        self.0.fetch_sub(1, Ordering::AcqRel);
    }
}

impl ReportCommandHandler {
    /// Compose after loading state. Pass the saved report IDs to suppress restart repeats.
    pub fn new(dependencies: ReportDependencies, saved_commands: Vec<String>) -> Self {
        Self {
            dependencies: Arc::new(dependencies),
            seen: Mutex::new(saved_commands.into_iter().collect()),
            jobs: Mutex::new(vec![]),
            stopped: Arc::new(AtomicBool::new(false)),
            initial: Arc::new(AtomicUsize::new(0)),
            startup_log: None,
        }
    }

    /// Share the process startup measurements supplied by the composition root.
    pub fn with_startup_log(mut self, startup_log: Arc<dyn StartupLog>) -> Self {
        self.startup_log = Some(startup_log);
        self
    }
}

#[async_trait]
impl CommandHandler for ReportCommandHandler {
    async fn busy(&self) -> Result<bool> {
        if self.initial.load(Ordering::Acquire) != 0
            || self
                .jobs
                .lock()
                .or(Err(Error::InvalidCommand))?
                .iter()
                .any(|job| !job.is_finished())
        {
            return Ok(true);
        }
        self.dependencies.next.busy().await
    }

    async fn working(&self) -> Result<bool> {
        self.dependencies.next.working().await
    }

    async fn start(&self) -> Result<()> {
        self.dependencies.files.start().await?;
        self.dependencies.next.start().await?;
        if let Some(watches) = &self.dependencies.watches {
            watches.start().await?;
        }
        Ok(())
    }

    fn connected(&self) -> BoxFuture<'static, Result<()>> {
        if self.stopped.load(Ordering::Acquire) {
            return Box::pin(async { Ok(()) });
        }
        self.initial.fetch_add(1, Ordering::AcqRel);
        let initial_report = InitialReport(self.initial.clone());
        let welcomed = self.dependencies.next.connected();
        let initial = self.dependencies.files.refresh(true, None, None);
        let dependencies = self.dependencies.clone();
        let stopped = self.stopped.clone();
        let startup_log = self.startup_log.clone();
        Box::pin(async move {
            let _initial_report = initial_report;
            welcomed.await?;
            if let Some(watches) = &dependencies.watches {
                watches.start().await?;
            }
            if initial.await.is_err() {
                tracing::warn!("The initial file reports could not be saved.");
                dependencies
                    .emitter
                    .emit(
                        vec![RunnerEvent::RunnerFileEvent(
                            RunnerFileEvent::FilesUnavailable {},
                        )],
                        None,
                    )
                    .await?;
            }
            if stopped.load(Ordering::Acquire) {
                return Ok(());
            }
            if let Some(ports) = &dependencies.ports {
                ports.refresh(true, None).await?;
            }
            if stopped.load(Ordering::Acquire) {
                return Ok(());
            }
            if let Some(skills) = &dependencies.skills
                && skills.refresh(true, None).await.is_err()
            {
                tracing::warn!("The initial skill lists are unavailable.");
            }
            if stopped.load(Ordering::Acquire) {
                return Ok(());
            }
            dependencies
                .emitter
                .emit(
                    vec![RunnerEvent::RunnerReady(RunnerReady::RunnerReady {})],
                    None,
                )
                .await?;
            if let Some(log) = startup_log {
                log.ready();
            }
            Ok(())
        })
    }

    fn command(&self, command: RunnerCommand) -> Result<()> {
        if self.stopped.load(Ordering::Acquire) {
            return Ok(());
        }
        let dependencies = self.dependencies.clone();
        let job = match command {
            RunnerCommand::RunnerControlCommand(RunnerControlCommand::RunnerFileCommand(
                command,
            )) => tokio::spawn(async move {
                let response = dependencies.files.request(command).await;
                let response = dependencies.filter.response(response);
                let result = match response {
                    Ok(response) => {
                        dependencies
                            .link
                            .reply(RunnerToWorkspace::RunnerFileResponse(response))
                            .await
                    }
                    Err(error) => Err(error),
                };
                if result.is_err() {
                    tracing::warn!("The runner command could not finish.");
                }
            }),
            RunnerCommand::RunnerControlCommand(RunnerControlCommand::RunnerReportRefresh(
                RunnerReportRefresh::ReportRefresh { command_id, kind },
            )) => {
                if !self
                    .seen
                    .lock()
                    .or(Err(Error::InvalidCommand))?
                    .insert(command_id.clone())
                {
                    return Ok(());
                }
                let action: BoxFuture<'static, Result<()>> = match kind {
                    RunnerReportKind::FilesSnapshot => dependencies.files.refresh(
                        true,
                        Some(FileReportKind::Tree),
                        Some(command_id),
                    ),
                    RunnerReportKind::ChangesUpdated => dependencies.files.refresh(
                        true,
                        Some(FileReportKind::Changes),
                        Some(command_id),
                    ),
                    RunnerReportKind::PortsUpdated => match &dependencies.ports {
                        Some(ports) => ports.refresh(true, Some(command_id)),
                        None => Box::pin(async { Ok(()) }),
                    },
                    RunnerReportKind::SkillsUpdated if dependencies.skills.is_some() => {
                        match &dependencies.skills {
                            Some(skills) => skills.refresh(true, Some(command_id)),
                            None => Box::pin(async { Ok(()) }),
                        }
                    }
                    kind => Box::pin(async move {
                        let now = dependencies.clock.now()?;
                        dependencies
                            .store
                            .refresh_report(kind, command_id, now, dependencies.filter.clone())
                            .await?;
                        dependencies.link.persist().await
                    }),
                };
                tokio::spawn(async move {
                    if action.await.is_err() {
                        tracing::warn!("The runner command could not finish.");
                    }
                })
            }
            command => return self.dependencies.next.command(command),
        };
        let mut jobs = self.jobs.lock().or(Err(Error::InvalidCommand))?;
        jobs.retain(|job| !job.is_finished());
        jobs.push(job);
        Ok(())
    }

    async fn shutdown(&self) -> Result<()> {
        self.stopped.store(true, Ordering::Release);
        let watches = async {
            if let Some(watches) = &self.dependencies.watches {
                watches.close().await;
            }
        };
        let turns = self.dependencies.next.shutdown();
        let files = self.dependencies.files.close();
        let ports = async {
            if let Some(ports) = &self.dependencies.ports {
                ports.close().await;
            }
        };
        let skills = async {
            if let Some(skills) = &self.dependencies.skills {
                skills.close().await;
            }
        };
        let (turns, _, _, _, _) = tokio::join!(turns, files, ports, watches, skills);
        let jobs = std::mem::take(&mut *self.jobs.lock().or(Err(Error::InvalidCommand))?);
        for job in jobs {
            let _ = job.await;
        }
        turns
    }
}

#[cfg(test)]
#[path = "_tests_/busy_tests.rs"]
mod busy_tests;
