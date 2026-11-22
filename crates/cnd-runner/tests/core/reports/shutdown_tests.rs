//! Held snapshots and debounced changes exercise the report shutdown boundary.

use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::Ordering;
use std::time::Duration;

use async_trait::async_trait;
use cnd_runner::error::{Error, Result};
use cnd_runner::reports::files::{FileReportKind, FileReports};
use cnd_runner::runtime::CommandHandler;
use cnd_runner::skills::boundary::SkillReports;
use cnd_runner::watcher::boundary::{RepositoryWatch, WatchDriver};
use cnd_runner::watcher::service::ReportWatchService;
use cnd_runner_interface::runner_commands::RunnerReportKind;
use futures_util::future::BoxFuture;
use tokio::sync::{Mutex, mpsc};
use tokio::time::timeout;

use crate::support::fixture::{self, Fixture};

use super::support::{self, Gate, Source, next_receipt};

const HANG_GUARD: Duration = Duration::from_secs(10);

struct Changes(Mutex<mpsc::UnboundedReceiver<()>>);

#[async_trait]
impl RepositoryWatch for Changes {
    async fn changed(&self) -> Result<()> {
        self.0.lock().await.recv().await.ok_or(Error::Disconnected)
    }

    async fn close(&self) {}
}

struct Driver(Arc<Changes>);

#[async_trait]
impl WatchDriver for Driver {
    async fn open(&self, _: PathBuf) -> Result<Arc<dyn RepositoryWatch>> {
        Ok(self.0.clone())
    }

    async fn exists(&self, _: PathBuf) -> bool {
        true
    }

    async fn delay(&self, duration: Duration) {
        tokio::time::sleep(duration).await;
    }
}

struct Scheduled(mpsc::UnboundedSender<()>);

#[async_trait]
impl SkillReports for Scheduled {
    fn refresh(&self, _: bool, _: Option<String>) -> BoxFuture<'static, Result<()>> {
        self.0.send(()).unwrap();
        Box::pin(async { Ok(()) })
    }

    async fn close(&self) {}
}

struct WatchFixture {
    runner: Fixture,
    handler: Arc<dyn CommandHandler>,
    files: Arc<dyn FileReports>,
    source: Arc<Source>,
    changes: mpsc::UnboundedSender<()>,
    scheduled: mpsc::UnboundedReceiver<()>,
}

impl WatchFixture {
    async fn new() -> Self {
        let runner = Fixture::new().await;
        let source = support::source(vec![]);
        let files = support::files(&runner, source.clone(), None, None).await;
        let (changes, events) = mpsc::unbounded_channel();
        let (schedule, scheduled) = mpsc::unbounded_channel();
        let watches = Arc::new(
            ReportWatchService::new(
                Arc::new(Driver(Arc::new(Changes(Mutex::new(events))))),
                files.clone(),
                None,
                "/repo".into(),
                "/run/restore-ended".into(),
            )
            .with_skills(Arc::new(Scheduled(schedule))),
        );
        let (handler, _) =
            support::handler_with_reports(&runner, files.clone(), None, Some(watches)).await;
        handler.start().await.unwrap();
        Self {
            runner,
            handler,
            files,
            source,
            changes,
            scheduled,
        }
    }

    async fn change(&mut self) {
        self.changes.send(()).unwrap();
        assert_eq!(
            timeout(HANG_GUARD, self.scheduled.recv()).await.unwrap(),
            Some(())
        );
    }

    async fn burst_behind(&mut self) -> Arc<Gate> {
        let gate = Arc::new(Gate::default());
        *self.source.hold.lock().unwrap() = Some(gate.clone());
        self.change().await;
        timeout(HANG_GUARD, gate.arrived.notified()).await.unwrap();
        *self.source.current.lock().unwrap() = support::snapshot(vec!["late.txt".into()]);
        for _ in 0..8 {
            self.change().await;
        }
        gate
    }
}

#[tokio::test(start_paused = true)]
async fn debounced_burst_runs_only_one_waiting_file_scan() {
    let mut h = WatchFixture::new().await;
    let gate = h.burst_behind().await;
    let after_burst = h.files.refresh(true, Some(FileReportKind::Tree), None);
    gate.release.notify_one();
    timeout(HANG_GUARD, after_burst).await.unwrap().unwrap();

    assert_eq!(h.source.scans.load(Ordering::Relaxed), 3);
    assert_eq!(h.runner.store.snapshot().await.file_revisions.tree, 3);
    h.handler.shutdown().await.unwrap();
}

#[tokio::test(start_paused = true)]
async fn shutdown_cancels_the_running_watch_scan_and_discards_waiting_scans() {
    let mut h = WatchFixture::new().await;
    let gate = h.burst_behind().await;

    let ended = timeout(HANG_GUARD, h.handler.shutdown()).await;
    assert!(matches!(ended, Ok(Ok(()))), "shutdown result: {ended:?}");
    timeout(HANG_GUARD, gate.canceled.notified()).await.unwrap();
    assert_eq!(h.source.scans.load(Ordering::Relaxed), 1);
    assert_eq!(h.runner.store.snapshot().await.outbox, []);
}

#[tokio::test(start_paused = true)]
async fn shutdown_leaves_canceled_refresh_commands_unanswered() {
    let h = Fixture::new().await;
    let source = support::source(vec![]);
    let gate = Arc::new(Gate::default());
    *source.hold.lock().unwrap() = Some(gate.clone());
    let files = support::files(&h, source.clone(), None, None).await;
    let (handler, _) = support::handler(&h, files).await;
    let active = support::refresh(RunnerReportKind::FilesSnapshot, "active");
    let waiting = support::refresh(RunnerReportKind::ChangesUpdated, "waiting");
    handler.command(active.clone()).unwrap();
    timeout(HANG_GUARD, gate.arrived.notified()).await.unwrap();
    handler.command(waiting.clone()).unwrap();

    let ended = timeout(HANG_GUARD, handler.shutdown()).await;
    assert!(matches!(ended, Ok(Ok(()))), "shutdown result: {ended:?}");
    h.link.persist().await.unwrap();
    assert_eq!(source.scans.load(Ordering::Relaxed), 1);
    let saved = fixture::open(h.disk.clone()).await.snapshot().await;
    assert_eq!(saved.reports.commands, Vec::<String>::new());
    assert_eq!(saved.outbox, []);

    let (emitter, mut receipts) = support::track_receipts(&h);
    let files = support::files(&h, support::source(vec![]), Some(emitter), None).await;
    let (restarted, _) = support::handler(&h, files).await;
    restarted.command(active).unwrap();
    restarted.command(waiting).unwrap();
    assert_eq!(next_receipt(&mut receipts).await, "active");
    assert_eq!(next_receipt(&mut receipts).await, "waiting");
    assert_eq!(
        h.store.snapshot().await.reports.commands,
        ["active", "waiting"]
    );
    restarted.shutdown().await.unwrap();
}
