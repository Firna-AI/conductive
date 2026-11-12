//! Restart-time activation and fallback with mocked disk and process ports.

#![expect(
    clippy::unwrap_used,
    reason = "A failed test setup must stop the test."
)]

use std::path::PathBuf;

use unimock::{MockFn, Unimock, matching};

use super::ports::{ProcessesMock, State, StoreMock, UpdateEngine};

use super::test_support::{engine, locked};

#[test]
fn applies_the_newest_complete_version_without_downloading() {
    let engine = engine(Unimock::new((
        StoreMock::apply_lock.some_call(matching!()).returns(Ok(locked())),
        StoreMock::state.some_call(matching!()).returns(Ok(State { current: Some("0.0.2".into()), ..State::default() })),
        StoreMock::versions.some_call(matching!()).returns(Ok(vec!["0.0.3".into(), "0.0.10".into(), "0.0.9".into()])),
        StoreMock::transition.next_call(matching!((state) if state.current.as_deref() == Some("0.0.10") && state.previous.as_deref() == Some("0.0.2") && state.pending.as_deref() == Some("0.0.10"))).returns(Ok(())),
        StoreMock::version_path.some_call(matching!("0.0.10")).returns(PathBuf::from("/root/versions/0.0.10")),
    )), Unimock::new(()), Unimock::new(()),
    Unimock::new(ProcessesMock::install_system.next_call(matching!((path) if *path == std::path::Path::new("/root/versions/0.0.10"))).returns(Ok(()))));
    engine.apply().unwrap();
}

#[test]
fn pending_start_restores_previous_and_rejects_failed_release() {
    let engine = engine(Unimock::new((
        StoreMock::apply_lock.some_call(matching!()).returns(Ok(locked())),
        StoreMock::state.some_call(matching!()).returns(Ok(State { current: Some("0.0.5".into()), previous: Some("0.0.2".into()), pending: Some("0.0.5".into()) })),
        StoreMock::reject.some_call(matching!("0.0.5")).returns(Ok(())),
        StoreMock::transition.next_call(matching!((state) if state.current.as_deref() == Some("0.0.2") && state.pending.is_some())).returns(Ok(())),
        StoreMock::version_path.some_call(matching!("0.0.2")).returns(PathBuf::from("/root/versions/0.0.2")),
        StoreMock::transition.next_call(matching!((state) if state.current.as_deref() == Some("0.0.2") && state.pending.is_none())).returns(Ok(())),
    )), Unimock::new(()), Unimock::new(()),
    Unimock::new(ProcessesMock::install_system.next_call(matching!((path) if *path == std::path::Path::new("/root/versions/0.0.2"))).returns(Ok(()))));
    engine.apply().unwrap();
}

#[test]
fn runner_start_clears_pending_before_collection() {
    let engine = engine(Unimock::new((
        StoreMock::state.some_call(matching!()).returns(Ok(State { current: Some("0.0.5".into()), previous: Some("0.0.2".into()), pending: Some("0.0.5".into()) })),
        StoreMock::transition.next_call(matching!((state) if state.pending.is_none() && state.previous.as_deref() == Some("0.0.2"))).returns(Ok(())),
        StoreMock::apply_lock.some_call(matching!()).returns(Ok(locked())),
        StoreMock::collect.next_call(matching!()).returns(Ok(())),
    )), Unimock::new(()), Unimock::new(()), Unimock::new(()));
    engine.started().unwrap();
}

#[test]
fn apply_does_not_wait_for_a_background_download() {
    let engine = engine(
        Unimock::new(
            StoreMock::apply_lock
                .some_call(matching!())
                .returns(Ok(None)),
        ),
        Unimock::new(()),
        Unimock::new(()),
        Unimock::new(()),
    );
    engine.apply().unwrap();
}

#[test]
fn apply_ignores_complete_versions_older_than_current() {
    let engine = engine(
        Unimock::new((
            StoreMock::apply_lock
                .some_call(matching!())
                .returns(Ok(locked())),
            StoreMock::state.some_call(matching!()).returns(Ok(State {
                current: Some("0.0.5".into()),
                ..State::default()
            })),
            StoreMock::versions.some_call(matching!()).returns(Ok(vec![
                "0.0.2".into(),
                "0.0.5".into(),
                "0.0.4".into(),
            ])),
        )),
        Unimock::new(()),
        Unimock::new(()),
        Unimock::new(()),
    );
    engine.apply().unwrap();
}
