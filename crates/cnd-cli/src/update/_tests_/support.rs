//! Mock release clients, installers, and shared test data.

use std::path::Path;
use std::sync::Arc;

use async_trait::async_trait;
use cli_release_interface::ReleaseAssetInfo;
use cli_updater::BinaryInstaller;
use cnd_release::files::sha256;
use cnd_release::parts::{Part, PartsList};
use cnd_release::signature::ReleaseSigner;
use cnd_release::version::LATEST_KEY;
use unimock::{Clause, MockFn, Unimock, matching};

use super::engine::Engine;
use super::error::Error;
use super::ports::{ReleaseSource, StoreMock, UpdateLock};

const TEST_PUBLIC_KEY: [u8; 32] = [
    0xd7, 0x5a, 0x98, 0x01, 0x82, 0xb1, 0x0a, 0xb7, 0xd5, 0x4b, 0xfe, 0xd3, 0xc9, 0x64, 0x07, 0x3a,
    0x0e, 0xe1, 0x72, 0xf3, 0xda, 0xa6, 0x23, 0x25, 0xaf, 0x02, 0x1a, 0x68, 0xf7, 0x07, 0x51, 0x1a,
];

#[unimock::unimock(api = ClientMock)]
#[async_trait]
pub(super) trait Client {
    async fn download(&self, release: &ReleaseAssetInfo) -> cli_updater::Result<Vec<u8>>;
}

#[unimock::unimock(api = InstallerMock)]
pub(super) trait Installer {
    fn install(
        &self,
        archive_bytes: &[u8],
        binary: &str,
        current_exe: &Path,
        expected_sha256: Option<&str>,
        asset_name: &str,
    ) -> cli_updater::Result<()>;
}

struct Lock;
impl UpdateLock for Lock {}

pub(super) fn locked() -> Option<Box<dyn UpdateLock>> {
    Some(Box::new(Lock))
}

/// Each version records the test parts, and each part is on disk.
pub(super) fn complete_parts() -> impl Clause {
    (
        StoreMock::parts
            .each_call(matching!(_))
            .answers(&|_, _| parts().map_err(|_| Error::InvalidRelease)),
        StoreMock::has_part
            .each_call(matching!(_))
            .answers(&|_, _| Ok(true)),
    )
}

pub(super) fn release(version: &str) -> ReleaseAssetInfo {
    ReleaseAssetInfo {
        binary: "conductive".into(),
        version: version.into(),
        target: "x86_64-unknown-linux-musl".into(),
        asset_name: "program.tar.gz".into(),
        download_url: "https://releases.test/program.tar.gz".into(),
        sha256: Some("a".repeat(64)),
    }
}

pub(super) fn latest_json(reply: cli_updater::Result<Vec<u8>>) -> impl Clause {
    ClientMock::download
        .some_call(matching!((asset) if asset.download_url == LATEST_KEY))
        .returns(reply)
}

pub(super) fn signed_latest(version: &str) -> Result<impl Clause, Box<dyn std::error::Error>> {
    let manifest = serde_json::to_vec(&release(version))?;
    let signer = ReleaseSigner::from_pem(include_str!(
        "../../../../cnd-release/tests/fixtures/rfc8032-test-key.pem"
    ))?;
    let signature = signer.sign(&manifest)?.to_vec();
    Ok((
        latest_json(Ok(manifest)),
        ClientMock::download
            .some_call(matching!((asset) if asset.download_url.ends_with(".sig")))
            .returns(Ok(signature)),
    ))
}

pub(super) fn parts() -> cnd_release::error::Result<PartsList> {
    PartsList::new(
        ["sdk-helper", "node", "system"]
            .into_iter()
            .map(|name| Part {
                name: name.into(),
                url: format!("https://releases.test/{name}.tar.gz"),
                sha256: sha256(name.as_bytes()),
            })
            .collect(),
    )
}

pub(super) fn engine(
    store: Unimock,
    client: Unimock,
    installer: Unimock,
    processes: Unimock,
) -> Engine {
    Engine {
        store: Arc::new(store),
        client: Arc::new(Network(client)),
        installer: Arc::new(Archive(installer)),
        processes: Arc::new(processes),
    }
}

/// An engine with a hand-written release client, such as one that stalls.
pub(super) fn engine_with_client(store: Unimock, client: Arc<dyn ReleaseSource>) -> Engine {
    Engine {
        store: Arc::new(store),
        client,
        installer: Arc::new(Archive(Unimock::new(()))),
        processes: Arc::new(Unimock::new(())),
    }
}

pub(super) fn lock_only() -> Unimock {
    Unimock::new(StoreMock::lock.some_call(matching!()).returns(Ok(locked())))
}

struct Network(Unimock);
#[async_trait]
impl ReleaseSource for Network {
    async fn download(&self, release: &ReleaseAssetInfo) -> cli_updater::Result<Vec<u8>> {
        Client::download(&self.0, release).await
    }

    fn verification_key(&self) -> &[u8; 32] {
        &TEST_PUBLIC_KEY
    }
}
struct Archive(Unimock);
impl BinaryInstaller for Archive {
    fn install(
        &self,
        archive_bytes: &[u8],
        binary: &str,
        current_exe: &Path,
        expected_sha256: Option<&str>,
        asset_name: &str,
    ) -> cli_updater::Result<()> {
        Installer::install(
            &self.0,
            archive_bytes,
            binary,
            current_exe,
            expected_sha256,
            asset_name,
        )
    }
}
