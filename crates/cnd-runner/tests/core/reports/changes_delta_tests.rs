//! Welcome negotiation, revisions, and replay through the link and store.

use std::sync::Arc;
use std::sync::atomic::Ordering;
use std::time::Duration;

use cnd_runner::error::Error;
use cnd_runner::link::ports::LinkUpdate;
use cnd_runner_interface::file_tree::RunnerFileEvent;
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_handshake::{
    RunnerEventEnvelope, RunnerHello, RunnerResend, RunnerToWorkspace, WorkspaceToRunner,
};
use tokio::time::timeout;

use crate::support::fixture::{self, Fixture};

use super::support::{self, Gate, Source};

#[derive(Debug, PartialEq)]
enum Report {
    Full,
    Delta,
}

fn changes(events: &[RunnerEventEnvelope]) -> Vec<(u64, u64, Report, Option<u64>)> {
    events
        .iter()
        .filter_map(
            |RunnerEventEnvelope::Event {
                 event_number,
                 event,
                 ..
             }| match event {
                RunnerEvent::RunnerFileEvent(RunnerFileEvent::ChangesUpdated { changes }) => {
                    Some((
                        *event_number,
                        changes.runner_file_revision_part.revision,
                        Report::Full,
                        changes.changes_response.unpushed_commits,
                    ))
                }
                RunnerEvent::RunnerFileEvent(RunnerFileEvent::ChangesChanged { delta }) => Some((
                    *event_number,
                    delta.revision,
                    Report::Delta,
                    delta.unpushed_commits,
                )),
                _ => None,
            },
        )
        .collect()
}

fn edit(source: &Source, count: u64) {
    source.current.lock().unwrap().changes.unpushed_commits = Some(count);
}

#[tokio::test]
async fn changes_delta_reconnect_sends_a_full_list_even_when_a_watch_scan_is_running() {
    let h = Fixture::new().await;
    h.endpoint.state.lock().await.changes_deltas = Some(true);
    let source = support::source(vec![]);
    let files = support::files(&h, source.clone(), None, None).await;
    let (handler, _) = support::handler(&h, files.clone()).await;
    h.connected().await;
    handler.connected().await.unwrap();
    edit(&source, 1);
    files.refresh(false, None, None).await.unwrap();
    assert_eq!(
        changes(&h.endpoint.state.lock().await.events),
        [
            (1, 1, Report::Full, Some(0)),
            (4, 2, Report::Delta, Some(1)),
        ]
    );

    edit(&source, 2);
    let gate = Arc::new(Gate::default());
    *source.hold.lock().unwrap() = Some(gate.clone());
    let scan = files.refresh(false, None, None);
    timeout(Duration::from_secs(10), gate.arrived.notified())
        .await
        .unwrap();
    h.link.close().await.unwrap();
    h.connected().await;
    let initial = handler.connected();
    gate.release.notify_one();
    scan.await.unwrap();
    initial.await.unwrap();
    edit(&source, 3);
    files.refresh(false, None, None).await.unwrap();

    let state = h.endpoint.state.lock().await;
    assert_eq!(
        changes(&state.events),
        [
            (1, 1, Report::Full, Some(0)),
            (4, 2, Report::Delta, Some(1)),
            (5, 3, Report::Full, Some(2)),
            (6, 4, Report::Full, Some(2)),
            (9, 5, Report::Delta, Some(3)),
        ]
    );
    let offers: Vec<_> = state
        .received
        .iter()
        .filter_map(|message| match message {
            RunnerToWorkspace::RunnerHello(RunnerHello::Hello { changes_deltas, .. }) => {
                Some(*changes_deltas)
            }
            _ => None,
        })
        .collect();
    assert_eq!(offers, [Some(true), Some(true)]);
}

#[tokio::test]
async fn changes_delta_restart_replays_the_saved_event_and_uses_its_revision() {
    let h = Fixture::new().await;
    h.endpoint.state.lock().await.changes_deltas = Some(true);
    let source = support::source(vec![]);
    let files = support::files(&h, source.clone(), None, None).await;
    let (handler, _) = support::handler(&h, files.clone()).await;
    h.connected().await;
    handler.connected().await.unwrap();
    h.endpoint.state.lock().await.drop_next = true;
    edit(&source, 1);
    files.refresh(false, None, None).await.unwrap();
    let saved = h.store.snapshot().await;
    assert_eq!(
        changes(&saved.outbox),
        [
            (1, 1, Report::Full, Some(0)),
            (4, 2, Report::Delta, Some(1)),
        ]
    );
    assert_eq!(saved.file_revisions.changes, 2);
    h.link.close().await.unwrap();

    let store = fixture::open(h.disk.clone()).await;
    assert_eq!(store.snapshot().await, saved);
    let restarted = Fixture {
        link: fixture::link(store.clone(), h.endpoint.clone()),
        store,
        ..h
    };
    let files = support::files(&restarted, source.clone(), None, None).await;
    let (handler, _) = support::handler(&restarted, files.clone()).await;
    restarted.connected().await;
    assert_eq!(restarted.endpoint.state.lock().await.events, saved.outbox);
    handler.connected().await.unwrap();
    edit(&source, 2);
    files.refresh(false, None, None).await.unwrap();
    assert_eq!(
        changes(&restarted.endpoint.state.lock().await.events),
        [
            (1, 1, Report::Full, Some(0)),
            (4, 2, Report::Delta, Some(1)),
            (5, 3, Report::Full, Some(1)),
            (8, 4, Report::Delta, Some(2)),
        ]
    );
}

#[tokio::test]
async fn changes_delta_resend_keeps_its_payload_and_a_nonaccepting_welcome_restores_full_lists() {
    for acceptance in [None, Some(false)] {
        let h = Fixture::new().await;
        h.endpoint.state.lock().await.changes_deltas = Some(true);
        let source = support::source(vec![]);
        let files = support::files(&h, source.clone(), None, None).await;
        let (handler, _) = support::handler(&h, files.clone()).await;
        h.connected().await;
        handler.connected().await.unwrap();
        edit(&source, 1);
        files.refresh(false, None, None).await.unwrap();

        let first = h.store.snapshot().await;
        assert_eq!(
            changes(&first.outbox),
            [
                (1, 1, Report::Full, Some(0)),
                (4, 2, Report::Delta, Some(1)),
            ]
        );
        h.endpoint
            .inject(WorkspaceToRunner::RunnerResend(RunnerResend::Resend {
                stream_id: first.stream_id,
                from_event_number: 4,
            }))
            .await;
        assert_eq!(h.link.step().await.unwrap(), LinkUpdate::Progress);
        {
            let state = h.endpoint.state.lock().await;
            assert_eq!(state.events, first.outbox);
            assert_eq!(
                state.received.last(),
                first
                    .outbox
                    .last()
                    .map(|event| RunnerToWorkspace::RunnerEventEnvelope(event.clone()))
                    .as_ref()
            );
        }

        h.link.close().await.unwrap();
        edit(&source, 2);
        files.refresh(false, None, None).await.unwrap();
        let offline = h.store.snapshot().await;
        assert_eq!(
            changes(&offline.outbox).last(),
            Some(&(5, 3, Report::Delta, Some(2)))
        );
        h.endpoint.state.lock().await.changes_deltas = acceptance;
        h.connected().await;
        assert_eq!(h.endpoint.state.lock().await.events, offline.outbox);

        handler.connected().await.unwrap();
        edit(&source, 3);
        files.refresh(false, None, None).await.unwrap();
        assert_eq!(
            changes(&h.endpoint.state.lock().await.events),
            [
                (1, 1, Report::Full, Some(0)),
                (4, 2, Report::Delta, Some(1)),
                (5, 3, Report::Delta, Some(2)),
                (6, 4, Report::Full, Some(2)),
                (9, 5, Report::Full, Some(3)),
            ]
        );
    }
}

#[tokio::test]
async fn changes_delta_failed_save_sends_a_full_list_to_replace_pending_changes() {
    let h = Fixture::new().await;
    h.endpoint.state.lock().await.changes_deltas = Some(true);
    let source = support::source(vec![]);
    let files = support::files(&h, source.clone(), None, None).await;
    let (handler, _) = support::handler(&h, files.clone()).await;
    h.connected().await;
    handler.connected().await.unwrap();
    edit(&source, 1);
    h.disk.fail.store(true, Ordering::SeqCst);
    assert!(matches!(
        files.refresh(false, None, None).await,
        Err(Error::Disconnected)
    ));
    assert_eq!(
        changes(&h.store.snapshot().await.outbox),
        [(1, 1, Report::Full, Some(0))]
    );

    edit(&source, 0);
    files.refresh(false, None, None).await.unwrap();
    let saved = h.store.snapshot().await;
    assert_eq!(
        changes(&saved.outbox),
        [
            (1, 1, Report::Full, Some(0)),
            (4, 2, Report::Delta, Some(1)),
            (5, 3, Report::Full, Some(0)),
        ]
    );
    assert_eq!(h.link.step().await.unwrap(), LinkUpdate::Progress);
    assert_eq!(h.endpoint.state.lock().await.events, saved.outbox);
}
