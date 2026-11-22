//! Restart-time activation and fallback with mocked disk and process ports.

use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use unimock::{Clause, MockFn, Unimock, matching};

use super::error::Error;
use super::ports::{ProcessesMock, State, StoreMock, UpdateEngine};

use super::test_support::{ClientMock, complete_parts, engine, locked, parts};

#[tokio::test]
async fn applies_the_newest_complete_version_without_downloading()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(Unimock::new((
        complete_parts(),
        StoreMock::apply_lock.some_call(matching!()).returns(Ok(locked())),
        StoreMock::state.some_call(matching!()).returns(Ok(State { current: Some("0.0.2".into()), ..State::default() })),
        StoreMock::versions.some_call(matching!()).returns(Ok(vec!["0.0.3".into(), "0.0.10".into(), "0.0.9".into()])),
        StoreMock::transition.next_call(matching!((state) if state.current.as_deref() == Some("0.0.10") && state.previous.as_deref() == Some("0.0.2") && state.pending.as_deref() == Some("0.0.10"))).returns(Ok(())),
        StoreMock::version_path.some_call(matching!("0.0.10")).returns(PathBuf::from("/root/versions/0.0.10")),
    )), Unimock::new(()), Unimock::new(()),
    Unimock::new(ProcessesMock::install_system.next_call(matching!((path) if *path == std::path::Path::new("/root/versions/0.0.10"))).returns(Ok(()))));
    engine.apply().await?;
    Ok(())
}

/// The previous release 0.0.2 lacks its Node part until an unpack restores it.
fn previous_without_node(restored: &Arc<AtomicBool>) -> impl Clause {
    let present = restored.clone();
    (
        StoreMock::apply_lock
            .some_call(matching!())
            .returns(Ok(locked())),
        StoreMock::state.some_call(matching!()).returns(Ok(State {
            current: Some("0.0.5".into()),
            previous: Some("0.0.2".into()),
            pending: Some("0.0.5".into()),
        })),
        StoreMock::parts
            .each_call(matching!("0.0.2"))
            .answers(&|_, _| parts().map_err(|_| Error::InvalidRelease)),
        StoreMock::has_part
            .each_call(matching!(_))
            .answers_arc(Arc::new(move |_, part| {
                Ok(part.name != "node" || present.load(Ordering::SeqCst))
            })),
    )
}

#[tokio::test]
async fn pending_start_repairs_and_restores_previous_and_rejects_failed_release()
-> Result<(), Box<dyn std::error::Error>> {
    let restored = Arc::new(AtomicBool::new(false));
    let unpacked = restored.clone();
    let engine = engine(Unimock::new((
        previous_without_node(&restored),
        StoreMock::unpack.next_call(matching!((part, _) if part.name == "node")).answers_arc(Arc::new(move |_, _, _| {
            unpacked.store(true, Ordering::SeqCst);
            Ok(())
        })),
        StoreMock::reject.some_call(matching!("0.0.5")).returns(Ok(())),
        StoreMock::transition.next_call(matching!((state) if state.current.as_deref() == Some("0.0.2") && state.pending.is_some())).returns(Ok(())),
        StoreMock::version_path.some_call(matching!("0.0.2")).returns(PathBuf::from("/root/versions/0.0.2")),
        StoreMock::transition.next_call(matching!((state) if state.current.as_deref() == Some("0.0.2") && state.pending.is_none())).returns(Ok(())),
    )), Unimock::new(ClientMock::download.next_call(matching!((asset) if asset.binary == "node" && asset.version == "0.0.2")).returns(Ok(b"node".to_vec()))), Unimock::new(()),
    Unimock::new(ProcessesMock::install_system.next_call(matching!((path) if *path == std::path::Path::new("/root/versions/0.0.2"))).returns(Ok(()))));
    engine.apply().await?;
    assert!(
        restored.load(Ordering::SeqCst),
        "the fallback did not repair the previous release"
    );
    Ok(())
}

#[tokio::test]
async fn fallback_waits_while_the_previous_release_lacks_a_part()
-> Result<(), Box<dyn std::error::Error>> {
    let restored = Arc::new(AtomicBool::new(false));
    let engine = engine(
        Unimock::new(previous_without_node(&restored)),
        Unimock::new(ClientMock::download.next_call(matching!(_)).returns(Err(
            cli_updater::Error::ReleaseServerStatus {
                url: "https://releases.test/node.tar.gz".into(),
                status: 503,
            },
        ))),
        Unimock::new(()),
        Unimock::new(()),
    );
    assert!(matches!(
        engine.apply().await,
        Err(Error::PreviousIncomplete { version }) if version == "0.0.2"
    ));
    Ok(())
}

#[tokio::test]
async fn a_start_skips_a_newer_release_that_lacks_a_part() -> Result<(), Box<dyn std::error::Error>>
{
    let engine = engine(
        Unimock::new((
            StoreMock::apply_lock
                .some_call(matching!())
                .returns(Ok(locked())),
            StoreMock::state.some_call(matching!()).returns(Ok(State {
                current: Some("0.0.2".into()),
                ..State::default()
            })),
            StoreMock::versions
                .some_call(matching!())
                .returns(Ok(vec!["0.0.2".into(), "0.0.3".into()])),
            StoreMock::parts
                .each_call(matching!("0.0.2"))
                .answers(&|_, _| parts().map_err(|_| Error::InvalidRelease)),
            StoreMock::parts
                .each_call(matching!("0.0.3"))
                .answers(&|_, _| {
                    let mut staged = parts().map_err(|_| Error::InvalidRelease)?;
                    staged.parts[2].sha256 = "c".repeat(64);
                    Ok(staged)
                }),
            StoreMock::has_part
                .each_call(matching!(_))
                .answers(&|_, part| Ok(part.sha256 != "c".repeat(64))),
        )),
        Unimock::new(()),
        Unimock::new(()),
        Unimock::new(()),
    );
    engine.apply().await?;
    Ok(())
}

#[tokio::test]
async fn failed_fallback_installer_keeps_the_updater_of_the_failed_release()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(Unimock::new((
        complete_parts(),
        StoreMock::apply_lock.some_call(matching!()).returns(Ok(locked())),
        StoreMock::state.some_call(matching!()).returns(Ok(State { current: Some("0.0.5".into()), previous: Some("0.0.2".into()), pending: Some("0.0.5".into()) })),
        StoreMock::reject.some_call(matching!("0.0.5")).returns(Ok(())),
        StoreMock::transition.next_call(matching!((state) if state.current.as_deref() == Some("0.0.2") && state.pending.as_deref() == Some("0.0.5"))).returns(Ok(())),
        StoreMock::version_path.some_call(matching!("0.0.2")).returns(PathBuf::from("/root/versions/0.0.2")),
        StoreMock::transition.next_call(matching!((state) if state.current.as_deref() == Some("0.0.5") && state.previous.as_deref() == Some("0.0.2") && state.pending.as_deref() == Some("0.0.5"))).returns(Ok(())),
    )), Unimock::new(()), Unimock::new(()),
    Unimock::new(ProcessesMock::install_system.next_call(matching!(_)).returns(Err(Error::StartFailed))));
    assert!(matches!(engine.apply().await, Err(Error::StartFailed)));
    Ok(())
}

#[test]
fn runner_start_clears_pending_and_retains_the_next_release()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(Unimock::new((
        StoreMock::state.each_call(matching!()).answers(&|_| Ok(State { current: Some("0.0.5".into()), previous: Some("0.0.2".into()), pending: Some("0.0.5".into()) })),
        StoreMock::transition.next_call(matching!((state) if state.pending.is_none() && state.previous.as_deref() == Some("0.0.2"))).returns(Ok(())),
        StoreMock::apply_lock.some_call(matching!()).returns(Ok(locked())),
        StoreMock::lock.some_call(matching!()).returns(Ok(locked())),
        StoreMock::versions.some_call(matching!()).returns(Ok(vec!["0.0.6".into()])),
        StoreMock::collect.next_call(matching!((keep) if *keep == ["0.0.5", "0.0.2", "0.0.6"])).returns(Ok(())),
    )), Unimock::new(()), Unimock::new(()), Unimock::new(()));
    engine.started("0.0.5")?;
    Ok(())
}

#[tokio::test]
async fn apply_returns_at_once_while_another_apply_runs() -> Result<(), Box<dyn std::error::Error>>
{
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
    engine.apply().await?;
    Ok(())
}

#[tokio::test]
async fn apply_ignores_complete_versions_older_than_current()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(
        Unimock::new((
            complete_parts(),
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
    engine.apply().await?;
    Ok(())
}
