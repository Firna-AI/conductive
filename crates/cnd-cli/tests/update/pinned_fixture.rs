//! Local signed manifest and release store fixtures for pinned installs.

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Arc;

use cli_updater::TarGzBinaryInstaller;
use cnd_cli::update::disk::DiskStore;
use cnd_cli::update::engine::Engine;
use cnd_cli::update::error;
use cnd_cli::update::ports::{State, Store, UpdateEngine};
use cnd_cli::update::process::SystemProcesses;
use cnd_release::files::sha256;
use cnd_release::manifest::{program_archive_key, program_manifest_key};
use cnd_release::parts::{Part, PartsList};
use cnd_release::signature::manifest_signature_key;
use cnd_release::version::{BINARY, LATEST_KEY, TARGET};
use serde_json::json;

use crate::support::{Server, TestResult, archive, test_signer};

const ACTIVE: &str = "0.0.2";
pub(super) const PINNED: &str = "0.0.3";
pub(super) const NEWEST: &str = "0.0.4";

pub(super) struct PinnedFixture {
    pub(super) responses: HashMap<String, Vec<u8>>,
    pub(super) digest: String,
    pub(super) manifest_path: String,
    pub(super) program_path: String,
    pub(super) signature_path: String,
}

impl PinnedFixture {
    pub(super) fn replace_manifest(&mut self, manifest: Vec<u8>) -> TestResult {
        self.responses.remove(&self.signature_path);
        self.signature_path = format!("/{}", manifest_signature_key(&manifest));
        let signature = test_signer()?.sign(&manifest)?.to_vec();
        self.responses
            .insert(self.signature_path.clone(), signature);
        self.responses.insert(self.manifest_path.clone(), manifest);
        Ok(())
    }
}

pub(super) fn pinned_fixture() -> TestResult<PinnedFixture> {
    let helper = archive(&[("sdk-helper.mjs", b"helper bytes")])?;
    let parts = PartsList::new(vec![Part {
        name: "sdk-helper".into(),
        url: "https://releases.test/sdk-helper".into(),
        sha256: sha256(&helper),
    }])?;
    let executable = format!(
        "#!/bin/sh\ncase \"$1\" in\n--version) echo 'conductive {PINNED}';;\nupdate) cat <<'PARTS'\n{}\nPARTS\n;;\nesac\n",
        serde_json::to_string(&parts)?
    );
    let program = archive(&[(BINARY, executable.as_bytes())])?;
    let digest = sha256(&program);
    let program_path = format!("/{}", program_archive_key(PINNED, &digest)?);
    let manifest = manifest_json(PINNED, &digest)?;
    let mut fixture = PinnedFixture {
        responses: HashMap::from([
            (
                format!("/{LATEST_KEY}"),
                manifest_json(NEWEST, &"a".repeat(64))?,
            ),
            (program_path.clone(), program),
            ("/sdk-helper".into(), helper),
        ]),
        manifest_path: format!("/{}", program_manifest_key(PINNED, &digest)?),
        digest,
        program_path,
        signature_path: String::new(),
    };
    fixture.replace_manifest(manifest)?;
    Ok(fixture)
}

fn manifest_json(version: &str, digest: &str) -> TestResult<Vec<u8>> {
    Ok(serde_json::to_vec(&json!({
        "binary": BINARY,
        "target": TARGET,
        "version": version,
        "asset_name": "program.tar.gz",
        "download_url": "https://releases.test/archive",
        "sha256": digest,
        "added_field": true,
    }))?)
}

pub(super) async fn attempt_failed_install(
    fixture: PinnedFixture,
    missing_status: &'static str,
) -> TestResult<(error::Result<()>, Vec<String>)> {
    let server = Server::start_with_missing_status(fixture.responses, missing_status)?;
    let root = tempfile::tempdir()?;
    let (disk, engine) = updater(root.path(), &server);
    record_complete(disk.as_ref(), ACTIVE)?;
    let state = State {
        current: Some(ACTIVE.into()),
        ..State::default()
    };
    disk.transition(&state)?;
    let outcome = engine.install_pinned(PINNED, &fixture.digest).await;
    let requests = finish_server(server)?;
    assert_eq!(disk.state()?, state);
    assert_eq!(disk.versions()?, [ACTIVE]);
    assert!(!disk.version_path(PINNED).exists());
    assert!(!root.path().join("parts").exists());
    Ok((outcome, requests))
}

pub(super) fn updater(root: &Path, server: &Server) -> (Arc<DiskStore>, Engine) {
    let disk = Arc::new(DiskStore::new(root.to_path_buf()));
    let engine = Engine {
        store: disk.clone(),
        client: Arc::new(server.client.clone()),
        installer: Arc::new(TarGzBinaryInstaller::new()),
        processes: Arc::new(SystemProcesses),
    };
    (disk, engine)
}

pub(super) fn record_complete(disk: &DiskStore, version: &str) -> TestResult {
    let folder = disk.version_path(version);
    fs::create_dir_all(&folder)?;
    fs::write(folder.join(BINARY), b"previous program")?;
    disk.complete(version, &PartsList::new(vec![])?)?;
    Ok(())
}

pub(super) fn finish_server(server: Server) -> TestResult<Vec<String>> {
    let requests = server
        .requests
        .lock()
        .map(|requests| requests.clone())
        .map_err(|_| "request lock poisoned");
    server.finish()?;
    Ok(requests?)
}
