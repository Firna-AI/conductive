//! Background update requirements with no real IO.

#![expect(
    clippy::unwrap_used,
    reason = "A failed test setup must stop the test."
)]

use std::path::PathBuf;

use unimock::{MockFn, Unimock, matching};

use super::error::Error;
use super::ports::{ProcessesMock, State, StoreMock, UpdateEngine};

use super::test_support::{ClientMock, InstallerMock, engine, locked, parts, release};

#[tokio::test]
async fn downloads_only_a_newer_release() {
    for version in ["0.0.1", "0.0.2"] {
        let engine = engine(
            super::test_support::lock_only(),
            Unimock::new(
                ClientMock::latest
                    .some_call(matching!(_, _))
                    .returns(Ok(release(version))),
            ),
            Unimock::new(()),
            Unimock::new(()),
        );
        engine.check("0.0.2").await.unwrap();
    }
}

#[tokio::test]
async fn refuses_metadata_without_a_digest() {
    let mut latest = release("0.0.3");
    latest.sha256 = None;
    let engine = engine(
        super::test_support::lock_only(),
        Unimock::new(
            ClientMock::latest
                .some_call(matching!(_, _))
                .returns(Ok(latest)),
        ),
        Unimock::new(()),
        Unimock::new(()),
    );
    assert!(matches!(
        engine.check("0.0.2").await,
        Err(Error::MissingDigest)
    ));
}

#[tokio::test]
async fn concurrent_check_does_not_read_or_download() {
    let engine = engine(
        Unimock::new(StoreMock::lock.some_call(matching!()).returns(Ok(None))),
        Unimock::new(()),
        Unimock::new(()),
        Unimock::new(()),
    );
    assert!(matches!(engine.check("0.0.2").await, Err(Error::Busy)));
}

#[tokio::test]
async fn failed_download_leaves_the_store_unchanged() {
    let engine = engine(
        Unimock::new((
            StoreMock::lock.some_call(matching!()).returns(Ok(locked())),
            StoreMock::versions
                .some_call(matching!())
                .returns(Ok(vec![])),
            StoreMock::state
                .some_call(matching!())
                .returns(Ok(State::default())),
        )),
        Unimock::new((
            ClientMock::latest
                .some_call(matching!(_, _))
                .returns(Ok(release("0.0.3"))),
            ClientMock::download.some_call(matching!(_)).returns(Err(
                cli_updater::Error::ReleaseServerStatus {
                    url: "https://releases.test".into(),
                    status: 503,
                },
            )),
        )),
        Unimock::new(()),
        Unimock::new(()),
    );
    assert!(matches!(
        engine.check("0.0.2").await,
        Err(Error::Internal(_))
    ));
}

#[tokio::test]
async fn wrong_program_digest_never_completes_a_version() {
    let engine = engine(Unimock::new((
        StoreMock::lock.some_call(matching!()).returns(Ok(locked())),
        StoreMock::versions.some_call(matching!()).returns(Ok(vec![])),
        StoreMock::state.some_call(matching!()).returns(Ok(State::default())),
        StoreMock::prepare.some_call(matching!("0.0.3")).returns(Ok(())),
        StoreMock::version_path.some_call(matching!("0.0.3")).returns(PathBuf::from("/root/versions/0.0.3")),
    )), Unimock::new((
        ClientMock::latest.some_call(matching!(_, _)).returns(Ok(release("0.0.3"))),
        ClientMock::download.some_call(matching!(_)).returns(Ok(vec![1])),
    )), Unimock::new(InstallerMock::install.some_call(matching!((_, "conductive", path, Some(_), _) if *path == std::path::Path::new("/root/versions/0.0.3/conductive")))
        .returns(Err(cli_updater::Error::ChecksumMismatch { asset_name: "program.tar.gz".into() }))), Unimock::new(()));
    assert!(matches!(
        engine.check("0.0.2").await,
        Err(Error::Internal(_))
    ));
}

#[tokio::test]
async fn changed_parts_download_in_isolation_and_complete_last() {
    let list = parts();
    let engine = engine(Unimock::new((
        StoreMock::lock.some_call(matching!()).returns(Ok(locked())),
        StoreMock::versions.some_call(matching!()).returns(Ok(vec![])),
        StoreMock::state.some_call(matching!()).returns(Ok(State { current: Some("0.0.2".into()), ..State::default() })),
        StoreMock::prepare.some_call(matching!("0.0.3")).returns(Ok(())),
        StoreMock::version_path.some_call(matching!("0.0.3")).returns(PathBuf::from("/root/versions/0.0.3")),
        StoreMock::has_part.some_call(matching!((digest) if *digest == cnd_release::files::sha256(b"runner"))).returns(Ok(false)),
        StoreMock::has_part.each_call(matching!(_)).answers(&|_, _| Ok(true)),
        StoreMock::unpack.next_call(matching!((part, bytes) if part.name == "runner" && *bytes == b"runner")).returns(Ok(())),
        StoreMock::complete.next_call(matching!(("0.0.3", parts) if parts.parts.len() == 3)).returns(Ok(())),
    )), Unimock::new((
        ClientMock::latest.some_call(matching!(_, _)).returns(Ok(release("0.0.3"))),
        ClientMock::download.some_call(matching!((asset) if asset.binary == "conductive")).returns(Ok(vec![1])),
        ClientMock::download.some_call(matching!((asset) if asset.binary == "runner")).returns(Ok(b"runner".to_vec())),
    )), Unimock::new(InstallerMock::install.some_call(matching!((_, _, path, _, _) if *path == std::path::Path::new("/root/versions/0.0.3/conductive"))).returns(Ok(()))),
    Unimock::new(ProcessesMock::inspect.some_call(matching!(_, "0.0.3")).returns(Ok(list.clone()))));
    engine.check("0.0.2").await.unwrap();
}

#[tokio::test]
async fn failed_start_check_or_wrong_part_digest_never_marks_complete() {
    for (fail_start, expected) in [(true, "start"), (false, "digest")] {
        let mut list = parts();
        list.parts[0].sha256 = "b".repeat(64);
        let disk_base = (
            StoreMock::lock.some_call(matching!()).returns(Ok(locked())),
            StoreMock::versions
                .some_call(matching!())
                .returns(Ok(vec![])),
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
                    .some_call(matching!((asset) if asset.binary == "runner"))
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
            Err(Error::DigestMismatch { name }) if name == "runner" => "digest",
            _ => "unexpected",
        };
        assert_eq!(outcome, expected);
    }
}
