//! Background update requirements with no real IO.

use std::path::PathBuf;

use unimock::{Clause, MockFn, Unimock, matching};

use super::error::Error;
use super::ports::{ProcessesMock, State, StoreMock, UpdateEngine};

use super::test_support::{ClientMock, InstallerMock, engine, locked, parts, release};

/// The store of a check that stages 0.0.3 over 0.0.2 and downloads only its SDK helper.
fn staging_store() -> impl Clause {
    (
        StoreMock::lock.some_call(matching!()).returns(Ok(locked())),
        StoreMock::rejected
            .some_call(matching!(_))
            .returns(Ok(false)),
        StoreMock::state.some_call(matching!()).returns(Ok(State {
            current: Some("0.0.2".into()),
            ..State::default()
        })),
        StoreMock::prepare
            .some_call(matching!("0.0.3"))
            .returns(Ok(())),
        StoreMock::version_path
            .some_call(matching!("0.0.3"))
            .returns(PathBuf::from("/root/versions/0.0.3")),
        StoreMock::has_part
            .each_call(matching!(_))
            .answers(&|_, part| Ok(part.name != "sdk-helper")),
        StoreMock::unpack
            .next_call(
                matching!((part, bytes) if part.name == "sdk-helper" && *bytes == b"sdk-helper"),
            )
            .returns(Ok(())),
        StoreMock::complete
            .next_call(matching!(("0.0.3", parts) if parts.parts.len() == 3))
            .returns(Ok(())),
    )
}

/// A new release, and a complete staged release whose parts list is lost, both stage again.
#[tokio::test]
async fn changed_parts_download_in_isolation_and_complete_last()
-> Result<(), Box<dyn std::error::Error>> {
    for staged in [false, true] {
        let list = parts()?;
        let store = if staged {
            Unimock::new((
                staging_store(),
                StoreMock::versions
                    .some_call(matching!())
                    .returns(Ok(vec!["0.0.3".to_owned()])),
                StoreMock::parts
                    .some_call(matching!("0.0.3"))
                    .answers(&|_, _| Err(Error::InvalidRelease)),
            ))
        } else {
            Unimock::new((
                staging_store(),
                StoreMock::versions
                    .some_call(matching!())
                    .returns(Ok(vec![])),
            ))
        };
        let engine = engine(store, Unimock::new((
            ClientMock::latest.some_call(matching!(_, _)).returns(Ok(release("0.0.3"))),
            ClientMock::download.some_call(matching!((asset) if asset.binary == "conductive")).returns(Ok(vec![1])),
            ClientMock::download.some_call(matching!((asset) if asset.binary == "sdk-helper")).returns(Ok(b"sdk-helper".to_vec())),
        )), Unimock::new(InstallerMock::install.some_call(matching!((_, _, path, _, _) if *path == std::path::Path::new("/root/versions/0.0.3/conductive"))).returns(Ok(()))),
        Unimock::new(ProcessesMock::inspect.some_call(matching!(_, "0.0.3")).returns(Ok(list.clone()))));
        engine.check("0.0.2").await?;
    }
    Ok(())
}

/// The store of a check that finds 0.0.3 complete but without its SDK helper part.
fn staged_without_helper() -> impl Clause {
    (
        StoreMock::lock.some_call(matching!()).returns(Ok(locked())),
        StoreMock::rejected
            .some_call(matching!(_))
            .returns(Ok(false)),
        StoreMock::state.some_call(matching!()).returns(Ok(State {
            current: Some("0.0.2".into()),
            ..State::default()
        })),
        StoreMock::versions
            .some_call(matching!())
            .returns(Ok(vec!["0.0.3".to_owned()])),
        StoreMock::parts
            .each_call(matching!("0.0.3"))
            .answers(&|_, _| parts().map_err(|_| Error::InvalidRelease)),
        StoreMock::has_part
            .each_call(matching!(_))
            .answers(&|_, part| Ok(part.name != "sdk-helper")),
    )
}

#[tokio::test]
async fn a_staged_release_that_lost_a_part_is_repaired_in_place()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(
        Unimock::new((
            staged_without_helper(),
            StoreMock::unpack
                .next_call(matching!((part, _) if part.name == "sdk-helper"))
                .returns(Ok(())),
            StoreMock::restore_links
                .next_call(matching!("0.0.3"))
                .returns(Ok(())),
        )),
        Unimock::new((
            ClientMock::latest
                .some_call(matching!(_, _))
                .returns(Ok(release("0.0.3"))),
            ClientMock::download
                .next_call(
                    matching!((asset) if asset.binary == "sdk-helper" && asset.version == "0.0.3"),
                )
                .returns(Ok(b"sdk-helper".to_vec())),
        )),
        Unimock::new(()),
        Unimock::new(()),
    );
    engine.check("0.0.2").await?;
    Ok(())
}

#[tokio::test]
async fn a_failed_in_place_repair_keeps_the_staged_release()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(
        Unimock::new(staged_without_helper()),
        Unimock::new((
            ClientMock::latest
                .some_call(matching!(_, _))
                .returns(Ok(release("0.0.3"))),
            ClientMock::download.next_call(matching!(_)).returns(Err(
                cli_updater::Error::ReleaseServerStatus {
                    url: "https://releases.test/sdk-helper.tar.gz".into(),
                    status: 503,
                },
            )),
        )),
        Unimock::new(()),
        Unimock::new(()),
    );
    assert!(engine.check("0.0.2").await.is_err());
    Ok(())
}

#[tokio::test]
async fn failed_start_check_or_wrong_part_digest_never_marks_complete()
-> Result<(), Box<dyn std::error::Error>> {
    for (fail_start, expected) in [(true, "start"), (false, "digest")] {
        let mut list = parts()?;
        list.parts[0].sha256 = "b".repeat(64);
        let disk_base = (
            StoreMock::lock.some_call(matching!()).returns(Ok(locked())),
            StoreMock::versions
                .some_call(matching!())
                .returns(Ok(vec![])),
            StoreMock::rejected
                .some_call(matching!(_))
                .returns(Ok(false)),
            StoreMock::state
                .some_call(matching!())
                .returns(Ok(State::default())),
            StoreMock::prepare
                .some_call(matching!("0.0.3"))
                .returns(Ok(())),
            StoreMock::version_path
                .some_call(matching!("0.0.3"))
                .returns(PathBuf::from("/root/versions/0.0.3")),
        );
        let disk = if fail_start {
            Unimock::new(disk_base)
        } else {
            Unimock::new((
                disk_base,
                StoreMock::has_part
                    .some_call(matching!(_))
                    .returns(Ok(false)),
            ))
        };
        let client_base = (
            ClientMock::latest
                .some_call(matching!(_, _))
                .returns(Ok(release("0.0.3"))),
            ClientMock::download
                .some_call(matching!((asset) if asset.binary == "conductive"))
                .returns(Ok(vec![1])),
        );
        let client = if fail_start {
            Unimock::new(client_base)
        } else {
            Unimock::new((
                client_base,
                ClientMock::download
                    .some_call(matching!((asset) if asset.binary == "sdk-helper"))
                    .returns(Ok(b"bad".to_vec())),
            ))
        };
        let result = if fail_start {
            Err(super::error::Error::StartFailed)
        } else {
            Ok(list)
        };
        let engine = engine(
            disk,
            client,
            Unimock::new(
                InstallerMock::install
                    .some_call(matching!(_, _, _, _, _))
                    .returns(Ok(())),
            ),
            Unimock::new(
                ProcessesMock::inspect
                    .some_call(matching!(_, _))
                    .returns(result),
            ),
        );
        let outcome = match engine.check("0.0.2").await {
            Err(Error::StartFailed) => "start",
            Err(Error::DigestMismatch { name }) if name == "sdk-helper" => "digest",
            _ => "unexpected",
        };
        assert_eq!(outcome, expected);
    }
    Ok(())
}
