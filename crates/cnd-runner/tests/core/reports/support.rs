//! Controlled repository captures and a recording agent-command owner.

use std::collections::BTreeMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use async_trait::async_trait;
use cnd_runner::emitter::{EventEmitter, SavingEmitter};
use cnd_runner::error::Result;
use cnd_runner::reports::files::{FileReporter, FileReports};
use cnd_runner::reports::handler::{ReportCommandHandler, ReportDependencies};
use cnd_runner::reports::prepare::{ReportFilter, UnfilteredReports};
use cnd_runner::repository::error;
use cnd_runner::repository::service::{Checkpoint, Repository, RepositorySnapshot};
use cnd_runner::runtime::CommandHandler;
use cnd_runner::skills::boundary::SkillReports;
use cnd_runner::watcher::service::ReportWatches;
use cnd_runner_interface::file_changes::{ChangedFile, ChangesResponse, ChangesResponseSummary};
use cnd_runner_interface::file_tree::{FileEntry, FileEntryKind};
use cnd_runner_interface::files::{DiffResponse, FileResponse};
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_commands::{
    RunnerCommand, RunnerControlCommand, RunnerReportKind, RunnerReportRefresh,
};
use futures_util::future::BoxFuture;
use tokio::sync::{Notify, mpsc, watch};
use tokio::time::timeout;

use crate::support::fixture::{FixedClock, Fixture};

pub(super) struct Source {
    pub current: Mutex<RepositorySnapshot>,
    pub hold: Mutex<Option<Arc<Gate>>>,
    pub scans: AtomicUsize,
    canceled: watch::Sender<bool>,
}

#[derive(Default)]
pub(super) struct Gate {
    pub arrived: Notify,
    pub release: Notify,
    pub canceled: Notify,
}

#[async_trait]
impl Repository for Source {
    fn cancel(&self) {
        self.canceled.send_replace(true);
    }
    async fn prepare_context(&self) -> error::Result<()> {
        Ok(())
    }
    async fn snapshot(&self, _: String) -> error::Result<RepositorySnapshot> {
        self.scans.fetch_add(1, Ordering::Relaxed);
        let mut canceled = self.canceled.subscribe();
        if *canceled.borrow() {
            return Err(error::Error::Canceled);
        }
        let current = self.current.lock().unwrap().clone();
        let gate = self.hold.lock().unwrap().take();
        if let Some(gate) = gate {
            gate.arrived.notify_one();
            tokio::select! {
                _ = canceled.wait_for(|stopped| *stopped) => {
                    gate.canceled.notify_one();
                    return Err(error::Error::Canceled);
                }
                _ = gate.release.notified() => {}
            }
        }
        Ok(current)
    }
    async fn changes(&self, _: String) -> error::Result<ChangesResponse> {
        Ok(self.current.lock().unwrap().changes.clone())
    }
    async fn read(&self, _: String, _: u64) -> error::Result<FileResponse> {
        Err(error::Error::NotFound)
    }
    async fn diff(&self, _: String, _: String) -> error::Result<DiffResponse> {
        Err(error::Error::NotFound)
    }
    async fn checkpoint(&self) -> error::Result<Checkpoint> {
        Ok(BTreeMap::new())
    }
    async fn changed_since(&self, _: String, _: Checkpoint) -> error::Result<Vec<ChangedFile>> {
        Ok(vec![])
    }
}

pub(super) struct Next(pub mpsc::UnboundedSender<RunnerCommand>);
#[async_trait]
impl CommandHandler for Next {
    async fn busy(&self) -> Result<bool> {
        Ok(false)
    }
    fn connected(&self) -> BoxFuture<'static, Result<()>> {
        Box::pin(async { Ok(()) })
    }
    fn command(&self, command: RunnerCommand) -> Result<()> {
        self.0.send(command).unwrap();
        Ok(())
    }
    async fn shutdown(&self) -> Result<()> {
        Ok(())
    }
}

pub(super) fn snapshot(paths: Vec<String>) -> RepositorySnapshot {
    RepositorySnapshot {
        entries: paths
            .into_iter()
            .map(|path| FileEntry {
                path,
                display_path: None,
                name: "file".into(),
                kind: FileEntryKind::File,
                change: None,
            })
            .collect(),
        context_only_paths: Default::default(),
        changes: ChangesResponse {
            base_branch: "main".into(),
            display_base_branch: None,
            unpushed_commits: Some(0),
            uncommitted_file_count: Some(0),
            files: vec![],
            summary: ChangesResponseSummary {
                files: 0,
                added: 0,
                removed: 0,
            },
            omitted: None,
        },
        identities: BTreeMap::new(),
        read_identities: BTreeMap::new(),
        base_commit: "base".into(),
    }
}

pub(super) fn source(paths: Vec<String>) -> Arc<Source> {
    Arc::new(Source {
        current: Mutex::new(snapshot(paths)),
        hold: Mutex::new(None),
        scans: AtomicUsize::new(0),
        canceled: watch::channel(false).0,
    })
}

pub(super) async fn files(
    h: &Fixture,
    source: Arc<dyn Repository>,
    emitter: Option<Arc<dyn EventEmitter>>,
    filter: Option<Arc<dyn ReportFilter>>,
) -> Arc<dyn FileReports> {
    Arc::new(FileReporter::new(
        source,
        "main".into(),
        emitter.unwrap_or_else(|| Arc::new(SavingEmitter::new(h.link.clone()))),
        filter.unwrap_or_else(|| Arc::new(UnfilteredReports)),
        h.store.snapshot().await.file_revisions,
    ))
}

struct TrackedReceipts {
    emitter: SavingEmitter,
    receipts: mpsc::UnboundedSender<String>,
}

#[async_trait]
impl EventEmitter for TrackedReceipts {
    async fn emit(&self, events: Vec<RunnerEvent>, receipt: Option<String>) -> Result<()> {
        self.emitter.emit(events, receipt.clone()).await?;
        if let Some(receipt) = receipt {
            self.receipts.send(receipt).unwrap();
        }
        Ok(())
    }
}

pub(super) fn track_receipts(
    h: &Fixture,
) -> (Arc<dyn EventEmitter>, mpsc::UnboundedReceiver<String>) {
    let (receipts, recorded) = mpsc::unbounded_channel();
    let emitter = TrackedReceipts {
        emitter: SavingEmitter::new(h.link.clone()),
        receipts,
    };
    (Arc::new(emitter), recorded)
}

pub(super) async fn next_receipt(receipts: &mut mpsc::UnboundedReceiver<String>) -> String {
    timeout(Duration::from_secs(10), receipts.recv())
        .await
        .expect("report receipt hang guard")
        .expect("report receipt channel closed")
}

pub(super) async fn handler(
    h: &Fixture,
    files: Arc<dyn FileReports>,
) -> (
    Arc<dyn CommandHandler>,
    mpsc::UnboundedReceiver<RunnerCommand>,
) {
    handler_with_skills(h, files, None).await
}

pub(super) async fn handler_with_skills(
    h: &Fixture,
    files: Arc<dyn FileReports>,
    skills: Option<Arc<dyn SkillReports>>,
) -> (
    Arc<dyn CommandHandler>,
    mpsc::UnboundedReceiver<RunnerCommand>,
) {
    handler_with_reports(h, files, skills, None).await
}

pub(super) async fn handler_with_reports(
    h: &Fixture,
    files: Arc<dyn FileReports>,
    skills: Option<Arc<dyn SkillReports>>,
    watches: Option<Arc<dyn ReportWatches>>,
) -> (
    Arc<dyn CommandHandler>,
    mpsc::UnboundedReceiver<RunnerCommand>,
) {
    let (send, receive) = mpsc::unbounded_channel();
    let dependencies = ReportDependencies {
        skills,
        files,
        ports: None,
        emitter: Arc::new(SavingEmitter::new(h.link.clone())),
        link: h.link.clone(),
        store: h.store.clone(),
        clock: Arc::new(FixedClock),
        filter: Arc::new(UnfilteredReports),
        watches,
        next: Arc::new(Next(send)),
    };
    (
        Arc::new(ReportCommandHandler::new(
            dependencies,
            h.store.snapshot().await.reports.commands,
        )),
        receive,
    )
}

pub(super) fn refresh(kind: RunnerReportKind, id: &str) -> RunnerCommand {
    RunnerCommand::RunnerControlCommand(RunnerControlCommand::RunnerReportRefresh(
        RunnerReportRefresh::ReportRefresh {
            command_id: id.into(),
            kind,
        },
    ))
}
