//! Restart-time activation and fallback with mocked disk and process ports.

use std::path::PathBuf;

use unimock::{Clause, MockFn, Unimock, matching};

use super::error::Error;
use super::ports::{ProcessesMock, State, StoreMock, UpdateEngine};

use super::test_support::{complete_parts, engine, locked, parts, reachable_parts};

#[tokio::test]
async fn applies_the_newest_complete_version_without_downloading()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(Unimock::new((
        complete_parts(),
        reachable_parts(),
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

/// Each version records the test parts. Version 0.0.4 has a system part that is not on the disk.
fn releases_with_a_damaged_newest() -> impl Clause {
    (
        StoreMock::apply_lock
            .some_call(matching!())
            .returns(Ok(locked())),
        StoreMock::state.some_call(matching!()).returns(Ok(State {
            current: Some("0.0.2".into()),
            ..State::default()
        })),
        StoreMock::parts
            .each_call(matching!(_))
            .answers(&|_, version| {
                let mut list = parts().map_err(|_| Error::InvalidRelease)?;
                if version == "0.0.4" {
                    list.parts[2].sha256 = "c".repeat(64);
                }
                Ok(list)
            }),
        StoreMock::has_part
            .each_call(matching!(_))
            .answers(&|_, part| Ok(part.sha256 != "c".repeat(64))),
        StoreMock::restore_links
            .each_call(matching!(_))
            .answers(&|_, _| Ok(())),
    )
}

#[tokio::test]
async fn a_start_skips_a_newer_release_that_lacks_a_part() -> Result<(), Box<dyn std::error::Error>>
{
    let engine = engine(
        Unimock::new((
            releases_with_a_damaged_newest(),
            StoreMock::versions
                .some_call(matching!())
                .returns(Ok(vec!["0.0.2".into(), "0.0.4".into()])),
        )),
        Unimock::new(()),
        Unimock::new(()),
        Unimock::new(()),
    );
    engine.apply().await?;
    Ok(())
}

#[tokio::test]
async fn a_damaged_newest_release_does_not_block_a_ready_newer_release()
-> Result<(), Box<dyn std::error::Error>> {
    for listed in [["0.0.4", "0.0.3"], ["0.0.3", "0.0.4"]] {
        let engine = engine(
            Unimock::new((
                releases_with_a_damaged_newest(),
                reachable_parts(),
                StoreMock::versions
                    .some_call(matching!())
                    .returns(Ok(listed.map(String::from).to_vec())),
                StoreMock::transition
                    .next_call(matching!((state) if state.current.as_deref() == Some("0.0.3") && state.pending.as_deref() == Some("0.0.3")))
                    .returns(Ok(())),
                StoreMock::version_path
                    .some_call(matching!("0.0.3"))
                    .returns(PathBuf::from("/root/versions/0.0.3")),
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
    }
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

#[tokio::test]
async fn a_newer_release_that_cannot_reach_a_part_waits() -> Result<(), Box<dyn std::error::Error>>
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
                .returns(Ok(vec!["0.0.3".into()])),
            StoreMock::parts
                .each_call(matching!("0.0.3"))
                .answers(&|_, _| parts().map_err(|_| Error::InvalidRelease)),
            StoreMock::has_part
                .each_call(matching!(_))
                .answers(&|_, _| Ok(true)),
            StoreMock::restore_links
                .some_call(matching!("0.0.3"))
                .returns(Err(Error::InvalidRelease)),
            StoreMock::part_reachable
                .each_call(matching!("0.0.3", _))
                .answers(&|_, _, part| Ok(part.name != "system")),
        )),
        Unimock::new(()),
        Unimock::new(()),
        Unimock::new(()),
    );
    engine.apply().await?;
    Ok(())
}
