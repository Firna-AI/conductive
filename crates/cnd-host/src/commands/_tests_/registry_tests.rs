//! Completion between persisted and live observations must never produce lost.

#![expect(clippy::unwrap_used, reason = "Fixture failures must stop the test.")]

use std::sync::Arc;

use tokio::sync::Notify;
use unimock::{MockFn, Unimock, matching};

use crate::commands::records::{Exit, ReadExit, WriteExit};
use crate::commands::registry::{Registry, SavedRegistry, State};

#[tokio::test]
async fn completion_between_record_and_registry_observations_returns_exited() {
    let observed = Arc::new(Notify::new());
    let release = Arc::new(Notify::new());
    let seen = observed.clone();
    let gate = release.clone();
    let exit = Exit {
        exit_code: 7,
        timed_out: None,
    };
    let records = Arc::new(Unimock::new((
        ReadExit
            .some_call(matching!(9))
            .answers_arc(Arc::new(move |_, _| {
                let seen = seen.clone();
                let gate = gate.clone();
                Box::pin(async move {
                    seen.notify_one();
                    gate.notified().await;
                    Ok(None)
                })
            })),
        WriteExit
            .some_call(matching!(
                9,
                Exit {
                    exit_code: 7,
                    timed_out: None
                }
            ))
            .returns(Ok(())),
    )));
    let registry: Arc<dyn Registry> = Arc::new(SavedRegistry::new(records));
    registry.started(9);
    let reading = registry.clone();
    let status = tokio::spawn(async move { reading.snapshot(9).await });
    observed.notified().await;
    registry.finished(9, exit).await.unwrap();
    release.notify_one();
    assert_eq!(status.await.unwrap().unwrap(), State::Exited(exit));
}
