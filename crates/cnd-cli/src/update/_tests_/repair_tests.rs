//! Apply restores missing parts of the starting release, with mocked ports.

use std::path::{Path, PathBuf};

use cnd_release::files::sha256;
use unimock::{MockFn, Unimock, matching};

use super::error::Error;
use super::ports::{ProcessesMock, State, StoreMock, UpdateEngine};
use super::test_support::{ClientMock, engine, held, locked, parts};

#[tokio::test]
async fn apply_downloads_only_the_missing_parts_of_the_current_release()
-> Result<(), Box<dyn std::error::Error>> {
    let engine = engine(
        Unimock::new((
            StoreMock::apply_lock
                .some_call(matching!())
                .returns(Ok(locked())),
            StoreMock::state.some_call(matching!()).returns(Ok(State {
                current: Some("0.0.5".into()),
                ..State::default()
            })),
            StoreMock::versions
                .some_call(matching!())
                .returns(Ok(vec!["0.0.5".into()])),
            StoreMock::parts
                .some_call(matching!("0.0.5"))
                .answers(&|_, _| parts().map_err(|_| Error::InvalidRelease)),
            StoreMock::has_part
                .each_call(matching!((digest) if *digest == sha256(b"node")))
                .answers(&|_, _| Ok(false)),
            StoreMock::has_part
                .each_call(matching!(_))
                .answers(&|_, _| Ok(true)),
            StoreMock::installation_lock
                .next_call(matching!())
                .returns(Ok(held())),
            StoreMock::unpack
                .next_call(matching!((part, bytes) if part.name == "node" && *bytes == b"node"))
                .returns(Ok(())),
        )),
        Unimock::new(
            ClientMock::download
                .next_call(matching!((asset) if asset.download_url == "https://releases.test/node.tar.gz" && asset.version == "0.0.5"))
                .returns(Ok(b"node".to_vec())),
        ),
        Unimock::new(()),
        Unimock::new(()),
    );
    engine.apply().await?;
    Ok(())
}

#[tokio::test]
async fn failed_part_download_keeps_the_start() -> Result<(), Box<dyn std::error::Error>> {
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
                .some_call(matching!("0.0.3"))
                .answers(&|_, _| parts().map_err(|_| Error::InvalidRelease)),
            StoreMock::has_part
                .each_call(matching!((digest) if *digest == sha256(b"system")))
                .answers(&|_, _| Ok(false)),
            StoreMock::has_part
                .each_call(matching!(_))
                .answers(&|_, _| Ok(true)),
            StoreMock::installation_lock
                .next_call(matching!())
                .returns(Ok(held())),
            StoreMock::transition
                .next_call(matching!((state) if state.current.as_deref() == Some("0.0.3") && state.pending.as_deref() == Some("0.0.3")))
                .returns(Ok(())),
            StoreMock::version_path
                .some_call(matching!("0.0.3"))
                .returns(PathBuf::from("/root/versions/0.0.3")),
        )),
        Unimock::new(ClientMock::download.next_call(matching!(_)).returns(Err(
            cli_updater::Error::ReleaseServerStatus {
                url: "https://releases.test/system.tar.gz".into(),
                status: 503,
            },
        ))),
        Unimock::new(()),
        Unimock::new(
            ProcessesMock::install_system
                .next_call(matching!((path) if *path == Path::new("/root/versions/0.0.3")))
                .returns(Ok(())),
        ),
    );
    engine.apply().await?;
    Ok(())
}
