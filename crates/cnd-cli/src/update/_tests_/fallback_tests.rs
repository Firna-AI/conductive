//! A fallback after a start without confirmation, with mocked disk and process ports.

use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use unimock::{Clause, MockFn, Unimock, matching};

use super::error::Error;
use super::ports::{ProcessesMock, State, StoreMock, UpdateEngine};

use super::test_support::{ClientMock, complete_parts, engine, locked, parts, reachable_parts};

/// The previous release 0.0.2 lacks its Node part until an unpack restores it.
fn previous_without_node(restored: &Arc<AtomicBool>) -> impl Clause {
    let present = restored.clone();
    let reachable = restored.clone();
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
        StoreMock::restore_links
            .some_call(matching!("0.0.2"))
            .returns(Ok(())),
        StoreMock::part_reachable
            .each_call(matching!("0.0.2", _))
            .answers_arc(Arc::new(move |_, _, part| {
                Ok(part.name != "node" || reachable.load(Ordering::SeqCst))
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
async fn fallback_switches_to_a_previous_release_without_a_parts_list()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(
        Unimock::new((
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
                .answers(&|_, _| Err(Error::InvalidRelease)),
            StoreMock::restore_links
                .some_call(matching!("0.0.2"))
                .returns(Err(Error::InvalidRelease)),
            StoreMock::reject
                .some_call(matching!("0.0.5"))
                .returns(Ok(())),
            StoreMock::transition
                .next_call(matching!((state) if state.current.as_deref() == Some("0.0.2") && state.pending.is_some()))
                .returns(Ok(())),
            StoreMock::version_path
                .some_call(matching!("0.0.2"))
                .returns(PathBuf::from("/root/versions/0.0.2")),
            StoreMock::transition
                .next_call(matching!((state) if state.current.as_deref() == Some("0.0.2") && state.pending.is_none()))
                .returns(Ok(())),
        )),
        Unimock::new(()),
        Unimock::new(()),
        Unimock::new(
            ProcessesMock::install_system
                .next_call(matching!(_))
                .returns(Ok(())),
        ),
    );
    engine.apply().await?;
    Ok(())
}

#[tokio::test]
async fn failed_fallback_installer_keeps_the_updater_of_the_failed_release()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(Unimock::new((
        complete_parts(),
        reachable_parts(),
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

#[tokio::test]
async fn fallback_waits_while_the_previous_release_cannot_reach_a_part()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(
        Unimock::new((
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
                .answers(&|_, _| Ok(true)),
            StoreMock::restore_links
                .some_call(matching!("0.0.2"))
                .returns(Err(Error::InvalidRelease)),
            StoreMock::part_reachable
                .each_call(matching!("0.0.2", _))
                .answers(&|_, _, part| Ok(part.name != "node")),
        )),
        Unimock::new(()),
        Unimock::new(()),
        Unimock::new(()),
    );
    assert!(matches!(
        engine.apply().await,
        Err(Error::PreviousIncomplete { version }) if version == "0.0.2"
    ));
    Ok(())
}
