//! Serialized file scans, durable revisions, and independent file responses.

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use async_trait::async_trait;
use cnd_runner_interface::file_tree::{FileEntryKind, RunnerFileEvent};
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_files::{RunnerFileCommand, RunnerFileResponse};
use futures_util::future::BoxFuture;
use tokio::sync::Mutex;
use tokio::time::Instant;

use crate::emitter::EventEmitter;
use crate::error::Result;
use crate::repository::error::Error;
use crate::repository::service::Repository;
use crate::startup_log::StartupLog;
use crate::state::records::FileRevisions;

use super::changes::ChangesUpdate;
use super::history::History;
use super::prepare::ReportFilter;
use super::queue::SerialQueue;
use super::requests::respond;
use super::selection::{ReportLimits, select_changes};
use super::updates::TreeHistory;

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
                ..History::default()
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
        let changes = select_changes(&current.changes, self.limits.changed_files)?;
        let planned_tree = if kind == Some(FileReportKind::Changes) {
            None
        } else {
            let tree = TreeHistory::new(current.clone(), &changes, self.limits);
            let previous = state.tree.as_ref().filter(|_| !full && !state.unavailable);
            let Some(parts) = tree.parts(
                previous,
                state.changes.source.as_deref(),
                state.revisions.tree + 1,
                self.filter.as_ref(),
            )?
            else {
                tracing::warn!("The file report contains an entry that exceeds its byte limit.");
                return Ok(());
            };
            Some((tree, parts))
        };
        if kind != Some(FileReportKind::Tree) {
            let generation = self.emitter.changes_delta_generation().await;
            match state.changes.update(
                &current,
                changes.response,
                state.revisions.changes + 1,
                full,
                generation,
                self.filter.as_ref(),
            )? {
                ChangesUpdate::Unchanged => {}
                ChangesUpdate::Oversized => {
                    tracing::warn!(
                        "The file report contains an entry that exceeds its byte limit."
                    );
                    return Ok(());
                }
                ChangesUpdate::Report { parts, baseline } => {
                    state.changes.baseline = None;
                    state
                        .emit_parts(self.emitter.as_ref(), parts, command_id.clone())
                        .await?;
                    state.changes.baseline = baseline;
                }
            }
            state.changes.source = Some(current);
        }
        if let Some((tree, parts)) = planned_tree {
            state
                .emit_parts(self.emitter.as_ref(), parts, command_id)
                .await?;
            state.tree = Some(tree);
            state.unavailable = false;
        }
        Ok(())
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
