//! Activation must advance current before the old runner execs a new release.

#![allow(clippy::unwrap_used)]

use std::path::Path;
use std::sync::Arc;

use tokio::sync::watch;
use unimock::{MockFn, Unimock, matching};

use crate::runner_update::ports::{RunnerSwap, SwapProcessesMock};
use crate::runner_update::swap::UpdateRunner;
use crate::update::error::Error;
use crate::update::ports::{State, StoreMock};

fn updater(effects: Unimock) -> UpdateRunner {
    UpdateRunner {
        store: Arc::new(effects.clone()),
        processes: Arc::new(effects),
        running_version: "0.0.9".into(),
        executable: "/install/versions/0.0.9/conductive".into(),
        start_script: "/install/current/system/runner-start.sh".into(),
    }
}

#[tokio::test]
async fn applies_then_reads_current_then_execs_a_numerically_newer_release() {
    let effects = Unimock::new((
        SwapProcessesMock::apply
            .next_call(
                matching!((path) if *path == Path::new("/install/versions/0.0.9/conductive")),
            )
            .returns(Ok(())),
        StoreMock::state.next_call(matching!()).returns(Ok(State {
            current: Some("0.0.10".into()),
            pending: Some("0.0.10".into()),
            ..State::default()
        })),
        SwapProcessesMock::exec
            .next_call(
                matching!((path) if *path == Path::new("/install/current/system/runner-start.sh")),
            )
            .returns(Err(Error::StartFailed)),
    ));
    let (_stop, shutdown) = watch::channel(false);
    let updater = updater(effects);
    assert!(matches!(
        updater.swap(shutdown).await,
        Err(Error::StartFailed)
    ));
}

#[tokio::test]
async fn reconnects_without_exec_when_apply_did_not_advance_current() {
    for current in [Some("0.0.9"), Some("0.0.8"), None] {
        let effects = Unimock::new((
            SwapProcessesMock::apply
                .next_call(matching!(_))
                .returns(Ok(())),
            StoreMock::state.next_call(matching!()).returns(Ok(State {
                current: current.map(str::to_owned),
                ..State::default()
            })),
        ));
        let (_stop, shutdown) = watch::channel(false);
        updater(effects).swap(shutdown).await.unwrap();
    }
}

#[tokio::test]
async fn a_failed_unchanged_apply_reconnects_without_exec() {
    let effects = Unimock::new((
        SwapProcessesMock::apply
            .next_call(matching!(_))
            .returns(Err(Error::StartFailed)),
        StoreMock::state.next_call(matching!()).returns(Ok(State {
            current: Some("0.0.9".into()),
            ..State::default()
        })),
    ));
    let (_stop, shutdown) = watch::channel(false);
    let updater = updater(effects);
    assert!(matches!(updater.swap(shutdown).await, Ok(())));
}

#[tokio::test]
async fn a_failed_apply_with_changed_state_exits_for_the_service_to_roll_back() {
    for (current, pending) in [
        (Some("0.0.10"), None),
        (Some("0.0.9"), Some("0.0.10")),
        (None, None),
    ] {
        let effects = Unimock::new((
            SwapProcessesMock::apply
                .next_call(matching!(_))
                .returns(Err(Error::StartFailed)),
            StoreMock::state.next_call(matching!()).returns(Ok(State {
                current: current.map(str::to_owned),
                pending: pending.map(str::to_owned),
                ..State::default()
            })),
        ));
        let (_stop, shutdown) = watch::channel(false);
        assert!(
            matches!(
                updater(effects).swap(shutdown).await,
                Err(Error::StartFailed)
            ),
            "{current:?} {pending:?}"
        );
    }
}

#[tokio::test]
async fn a_shutdown_during_apply_prevents_exec() {
    let (stop, shutdown) = watch::channel(false);
    let effects = Unimock::new((
        SwapProcessesMock::apply
            .next_call(matching!(_))
            .answers_arc(Arc::new(move |_, _| {
                stop.send_replace(true);
                Ok(())
            })),
        StoreMock::state.next_call(matching!()).returns(Ok(State {
            current: Some("0.0.10".into()),
            ..State::default()
        })),
    ));
    updater(effects).swap(shutdown).await.unwrap();
}
