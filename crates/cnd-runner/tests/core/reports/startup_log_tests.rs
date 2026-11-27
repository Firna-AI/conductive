//! Startup measurements use one monotonic origin and do not repeat on reconnect.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use cnd_runner::emitter::{EventEmitter, SavingEmitter};
use cnd_runner::reports::files::{FileReporter, FileReports};
use cnd_runner::reports::handler::{ReportCommandHandler, ReportDependencies};
use cnd_runner::reports::prepare::UnfilteredReports;
use cnd_runner::runtime::{RunExit, Runner, RunnerCore};
use cnd_runner::startup_log::{ProcessStartupLog, StartupLog};
use cnd_runner::state::records::FileRevisions;
use cnd_runner::update::NoUpdates;
use cnd_runner_interface::file_tree::{FileEntry, FileEntryKind};
use cnd_runner_interface::runner_handshake::{
    RunnerProtocolVersion, RunnerWelcome, WorkspaceToRunner,
};
use tokio::sync::{mpsc, watch};
use tokio::time::Instant;

use crate::support::fixture::{FixedClock, Fixture};

use super::startup_support::{HeldReady, Logs};
use super::support::{Gate, Next, source};

#[tokio::test(start_paused = true)]
async fn logs_startup_milliseconds_and_file_count_once_across_reconnects() {
    let logs = Logs::default();
    let _subscriber = tracing::subscriber::set_default(logs.clone());
    let startup_log: Arc<dyn StartupLog> = Arc::new(ProcessStartupLog::new(Instant::now()));
    let h = Fixture::new().await;
    h.endpoint.state.lock().await.welcome = false;
    let repository = source(vec!["private/token.txt".into(), "secret-id.txt".into()]);
    repository.current.lock().unwrap().entries.push(FileEntry {
        path: "private".into(),
        display_path: None,
        name: "private".into(),
        kind: FileEntryKind::Directory,
        change: None,
    });
    let scan = Arc::new(Gate::default());
    let ready = Arc::new(Gate::default());
    let (emitted, mut ready_events) = mpsc::unbounded_channel();
    let emitter: Arc<dyn EventEmitter> = Arc::new(HeldReady {
        emitter: Arc::new(SavingEmitter::new(h.link.clone())),
        hold: Mutex::new(Some(ready.clone())),
        emitted,
    });
    let files: Arc<dyn FileReports> = Arc::new(
        FileReporter::new(
            repository.clone(),
            "private-branch-id".into(),
            emitter.clone(),
            Arc::new(UnfilteredReports),
            FileRevisions::default(),
        )
        .with_startup_log(startup_log.clone()),
    );
    files.refresh(false, None, None).await.unwrap();
    assert_eq!(logs.lines(), Vec::<String>::new());
    *repository.hold.lock().unwrap() = Some(scan.clone());
    let (commands, _received) = mpsc::unbounded_channel();
    let handler = Arc::new(
        ReportCommandHandler::new(
            ReportDependencies {
                files,
                ports: None,
                skills: None,
                emitter,
                link: h.link.clone(),
                store: h.store.clone(),
                clock: Arc::new(FixedClock),
                filter: Arc::new(UnfilteredReports),
                watches: None,
                next: Arc::new(Next(commands)),
            },
            vec![],
        )
        .with_startup_log(startup_log.clone()),
    );
    let core = RunnerCore::new(
        h.link.clone(),
        h.store.clone(),
        Arc::new(FixedClock),
        handler,
        Arc::new(NoUpdates),
    )
    .with_startup_log(startup_log);
    let (stop, shutdown) = watch::channel(false);
    tokio::time::advance(Duration::from_micros(20_750)).await;
    let running = tokio::spawn(async move { core.run(shutdown).await });
    logs.wait_for(1).await;
    assert_eq!(
        logs.lines(),
        ["INFO The runner made its first connection. elapsed_ms=20"]
    );

    tokio::time::advance(Duration::from_millis(15)).await;
    h.endpoint
        .inject(WorkspaceToRunner::RunnerWelcome(RunnerWelcome::Welcome {
            protocol_version: RunnerProtocolVersion,
            stream_id: "stream".into(),
            confirmed_through: 0,
            complete_tool_details: None,
            services: None,
            changes_deltas: None,
        }))
        .await;
    scan.arrived.notified().await;
    assert_eq!(
        logs.lines(),
        [
            "INFO The runner made its first connection. elapsed_ms=20",
            "INFO The runner received its first welcome. elapsed_ms=35",
        ]
    );

    tokio::time::advance(Duration::from_micros(12_500)).await;
    scan.release.notify_one();
    ready.arrived.notified().await;
    assert_eq!(
        logs.lines(),
        [
            "INFO The runner made its first connection. elapsed_ms=20",
            "INFO The runner received its first welcome. elapsed_ms=35",
            "INFO The runner finished its first repository scan. duration_ms=12 file_count=2",
        ]
    );

    tokio::time::advance(Duration::from_millis(10)).await;
    ready.release.notify_one();
    logs.wait_for(4).await;
    ready_events.recv().await.unwrap();
    let expected = [
        "INFO The runner made its first connection. elapsed_ms=20",
        "INFO The runner received its first welcome. elapsed_ms=35",
        "INFO The runner finished its first repository scan. duration_ms=12 file_count=2",
        "INFO The runner emitted its first ready event. elapsed_ms=58",
    ];
    assert_eq!(logs.lines(), expected);

    h.endpoint.state.lock().await.welcome = true;
    h.endpoint.disconnect().await;
    ready_events.recv().await.unwrap();
    stop.send_replace(true);
    assert_eq!(running.await.unwrap().unwrap(), RunExit::Shutdown);
    assert_eq!(logs.lines(), expected);
}
