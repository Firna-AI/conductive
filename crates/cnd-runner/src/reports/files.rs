//! Serialized file scans, durable revisions, and independent file responses.

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use async_trait::async_trait;
use cnd_runner_interface::file_changes::RunnerChangesPart;
use cnd_runner_interface::file_tree::{FileEntryKind, RunnerFileEvent, RunnerFileRevisionPart};
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_files::{RunnerFileCommand, RunnerFileResponse};
use futures_util::future::BoxFuture;
use tokio::sync::Mutex;
use tokio::time::Instant;

use crate::emitter::EventEmitter;
use crate::error::Result;
use crate::repository::error::Error;
use crate::repository::service::{Repository, RepositorySnapshot};
use crate::startup_log::StartupLog;
use crate::state::records::FileRevisions;

use super::parts::split;
use super::prepare::ReportFilter;
use super::queue::SerialQueue;
use super::requests::respond;
use super::selection::{ReportLimits, select_changes};
use super::updates::{TreeHistory, changes_updated};

/// Select only one kind for a report request.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileReportKind {
    /// Full tree.
    Tree,
    /// Full changes list.
    Changes,
}

/// Scan service shared by connection, requests, and repository watches.
#[cfg_attr(test, unimock::unimock(api = FileReportsMock))]
#[async_trait]
pub trait FileReports: Send + Sync {
    /// Prepare context storage. A failure warns without blocking startup.
    async fn start(&self) -> Result<()>;
    /// Serialize with earlier scans. Watch refreshes share a waiting scan.
    fn refresh(
        &self,
        full: bool,
        kind: Option<FileReportKind>,
        command_id: Option<String>,
    ) -> BoxFuture<'static, Result<()>>;
    /// Cancel capture, skip waiting scans, and wait for active work to finish.
    async fn close(&self);
    /// File reads and diffs bypass the scan queue.
    async fn request(&self, command: RunnerFileCommand) -> RunnerFileResponse;
}

struct History {
    revisions: FileRevisions,
    tree: Option<TreeHistory>,
    changes: Option<Arc<RepositorySnapshot>>,
    unavailable: bool,
}

/// Reporter with separate last-tree and last-changes comparisons.
#[derive(Clone)]
pub struct FileReporter {
    repository: Arc<dyn Repository>,
    branch: String,
    emitter: Arc<dyn EventEmitter>,
    filter: Arc<dyn ReportFilter>,
    limits: ReportLimits,
    history: Arc<Mutex<History>>,
    queue: Arc<SerialQueue>,
    stopped: Arc<AtomicBool>,
    queued: Arc<AtomicBool>,
    startup_log: Option<Arc<dyn StartupLog>>,
}

impl FileReporter {
    /// Compose with an independent repository and revisions from the loaded durable state.
    /// Closing this reporter cancels its repository instance.
    pub fn new(
        repository: Arc<dyn Repository>,
        branch: String,
        emitter: Arc<dyn EventEmitter>,
        filter: Arc<dyn ReportFilter>,
        revisions: FileRevisions,
    ) -> Self {
        Self {
            repository,
            branch,
            emitter,
            filter,
            limits: ReportLimits::default(),
            history: Arc::new(Mutex::new(History {
                revisions,
                tree: None,
                changes: None,
                unavailable: false,
            })),
            queue: Arc::new(SerialQueue::default()),
            stopped: Arc::new(AtomicBool::new(false)),
            queued: Arc::new(AtomicBool::new(false)),
            startup_log: None,
        }
    }

    /// Share the process startup measurements supplied by the composition root.
    pub fn with_startup_log(mut self, startup_log: Arc<dyn StartupLog>) -> Self {
        self.startup_log = Some(startup_log);
        self
    }

    async fn scan(
        &self,
        state: &mut History,
        full: bool,
        kind: Option<FileReportKind>,
        command_id: Option<String>,
    ) -> Result<()> {
        if self.stopped.load(Ordering::Acquire) {
            return Ok(());
        }
        let started = Instant::now();
        let captured = self.repository.snapshot(self.branch.clone()).await;
        if self.stopped.load(Ordering::Acquire) || matches!(&captured, Err(Error::Canceled)) {
            return Ok(());
        }
        let duration = started.elapsed();
        if full
            && kind.is_none()
            && command_id.is_none()
            && let Some(log) = &self.startup_log
        {
            let file_count = captured.as_ref().map_or(0, |snapshot| {
                snapshot
                    .entries
                    .iter()
                    .filter(|entry| entry.kind == FileEntryKind::File)
                    .count()
            });
            log.scanned(duration, file_count);
        }
        let current = match captured {
            Ok(current) => Arc::new(current),
            Err(_) => {
                state.unavailable = true;
                tracing::warn!("The file tree could not be read.");
                return self
                    .emitter
                    .emit(
                        vec![RunnerEvent::RunnerFileEvent(
                            RunnerFileEvent::FilesUnavailable {},
                        )],
                        command_id,
                    )
                    .await;
            }
        };
        let send_changes = kind != Some(FileReportKind::Tree)
            && (full || changes_updated(state.changes.as_deref(), &current));
        let changes_response = select_changes(&current.changes, self.limits.changed_files)?;
        if kind != Some(FileReportKind::Changes) {
            let tree = TreeHistory::new(current.clone(), &changes_response, self.limits);
            let previous = state.tree.as_ref().filter(|tree| {
                !full
                    && !state.unavailable
                    && state.changes.as_deref().is_none_or(|published| {
                        tree.can_use_delta(published, &current, self.limits.changed_files)
                    })
            });
            let parts = tree.parts(previous, state.revisions.tree + 1, self.filter.as_ref())?;
            if !self.emit_parts(state, parts, command_id.clone()).await? {
                return Ok(());
            }
            state.tree = Some(tree);
            state.unavailable = false;
        }
        if send_changes {
            let event = RunnerFileEvent::ChangesUpdated {
                changes: RunnerChangesPart {
                    changes_response,
                    runner_file_revision_part: RunnerFileRevisionPart {
                        revision: state.revisions.changes + 1,
                        part_number: 1,
                        part_count: 1,
                    },
                },
            };
            let parts = split(self.filter.file_report(event)?)?;
            if !self.emit_parts(state, parts, command_id).await? {
                return Ok(());
            }
        }
        if kind != Some(FileReportKind::Tree) {
            state.changes = Some(current);
        }
        Ok(())
    }

    async fn emit_parts(
        &self,
        state: &mut History,
        parts: Option<Vec<RunnerFileEvent>>,
        command_id: Option<String>,
    ) -> Result<bool> {
        let Some(parts) = parts else {
            tracing::warn!("The file report contains an entry that exceeds its byte limit.");
            return Ok(false);
        };
        let total = parts.len();
        for (index, part) in parts.into_iter().enumerate() {
            match &part {
                RunnerFileEvent::FilesSnapshot { tree } => {
                    state.revisions.tree = tree.part.revision
                }
                RunnerFileEvent::FilesChanged { delta } => state.revisions.tree = delta.revision,
                RunnerFileEvent::ChangesUpdated { changes } => {
                    state.revisions.changes = changes.runner_file_revision_part.revision
                }
                _ => {}
            }
            self.emitter
                .emit(
                    vec![RunnerEvent::RunnerFileEvent(part)],
                    if index + 1 == total {
                        command_id.clone()
                    } else {
                        None
                    },
                )
                .await?;
        }
        Ok(true)
    }
}

#[async_trait]
impl FileReports for FileReporter {
    async fn start(&self) -> Result<()> {
        if self.repository.prepare_context().await.is_err() {
            tracing::warn!("The context folder could not be prepared. The runner will continue.");
        }
        Ok(())
    }

    fn refresh(
        &self,
        full: bool,
        kind: Option<FileReportKind>,
        command_id: Option<String>,
    ) -> BoxFuture<'static, Result<()>> {
        let watch_refresh = !full && kind.is_none() && command_id.is_none();
        if self.stopped.load(Ordering::Acquire)
            || (watch_refresh && self.queued.swap(true, Ordering::AcqRel))
        {
            return Box::pin(async { Ok(()) });
        }
        let reporter = self.clone();
        self.queue.run(async move {
            let mut state = reporter.history.lock().await;
            if watch_refresh {
                reporter.queued.store(false, Ordering::Release);
            }
            let result = reporter.scan(&mut state, full, kind, command_id).await;
            if result.is_err() {
                state.unavailable = true;
            }
            result
        })
    }

    async fn close(&self) {
        self.stopped.store(true, Ordering::Release);
        self.repository.cancel();
        let _active = self.history.lock().await;
    }

    async fn request(&self, command: RunnerFileCommand) -> RunnerFileResponse {
        respond(self.repository.as_ref(), command).await
    }
}

#[cfg(test)]
#[path = "../_tests_/reports/mod.rs"]
mod reports_tests;
