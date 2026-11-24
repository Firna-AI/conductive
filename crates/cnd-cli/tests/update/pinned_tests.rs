//! Pinned installation against a local server and a signed release.

use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::Arc;

use cli_updater::TarGzBinaryInstaller;
use cnd_cli::update::disk::DiskStore;
use cnd_cli::update::engine::Engine;
use cnd_cli::update::error::{self, Error};
use cnd_cli::update::ports::{State, Store, UpdateEngine};
use cnd_cli::update::process::SystemProcesses;
use cnd_release::files::sha256;
use cnd_release::manifest::{program_archive_key, release_manifest_bytes};
use cnd_release::parts::{Part, PartsList};
use cnd_release::signature::manifest_signature_key;
use cnd_release::version::{BINARY, LATEST_KEY};

use crate::support::{Server, TestResult, archive, test_signer};

const ACTIVE: &str = "0.0.2";
const PINNED: &str = "0.0.3";
const NEWEST: &str = "0.0.4";

#[tokio::test]
async fn pinned_install_stages_the_requested_version_without_fetching_latest() -> TestResult {
    let fixture = pinned_fixture()?;
    let server = Server::start(fixture.responses)?;
    let root = tempfile::tempdir()?;
    let (disk, engine) = updater(root.path(), &server);
    let result = engine.install_pinned(PINNED, &fixture.digest).await;
    let requests = finish_server(server)?;
    assert_eq!(
        requests,
        [
            fixture.signature_path,
            fixture.program_path,
            "/sdk-helper".into()
        ]
    );
    assert!(result.is_ok(), "pinned install failed: {result:?}");
    assert_eq!(disk.versions()?, [PINNED]);
    assert_eq!(disk.state()?, State::default());
    assert_eq!(
        fs::read(disk.version_path(PINNED).join("sdk-helper/sdk-helper.mjs"))?,
        b"helper bytes"
    );
    Ok(())
}

#[tokio::test]
async fn pinned_install_refuses_a_wrong_signature_without_staging() -> TestResult {
    let mut fixture = pinned_fixture()?;
    fixture
        .responses
        .insert(fixture.signature_path.clone(), vec![0; 64]);
    let signature_path = fixture.signature_path.clone();
    let (result, requests) = attempt_failed_install(fixture, "404 Not Found").await?;
    assert!(matches!(result, Err(Error::InvalidSignature)), "{result:?}");
    assert_eq!(requests, [signature_path]);
    Ok(())
}

#[tokio::test]
async fn pinned_install_refuses_a_missing_signature_without_staging() -> TestResult {
    for status in ["404 Not Found", "410 Gone"] {
        let mut fixture = pinned_fixture()?;
        fixture.responses.remove(&fixture.signature_path);
        let signature_path = fixture.signature_path.clone();
        let (result, requests) = attempt_failed_install(fixture, status).await?;
        assert!(
            matches!(result, Err(Error::MissingSignature)),
            "{status}: {result:?}"
        );
        assert_eq!(requests, [signature_path], "{status}");
    }
    Ok(())
}

#[tokio::test]
async fn pinned_install_refuses_a_wrong_program_digest_without_staging() -> TestResult {
    let mut fixture = pinned_fixture()?;
    fixture
        .responses
        .insert(fixture.program_path.clone(), b"wrong archive".to_vec());
    let expected_requests = [fixture.signature_path.clone(), fixture.program_path.clone()];
    let (result, requests) = attempt_failed_install(fixture, "404 Not Found").await?;
    assert!(
        matches!(&result, Err(Error::DigestMismatch { name }) if name == BINARY),
        "{result:?}"
    );
    assert_eq!(requests, expected_requests);
    Ok(())
}

#[tokio::test]
async fn pinned_install_skips_complete_rejected_and_active_versions() -> TestResult {
    let fixture = pinned_fixture()?;
    for (complete, rejected, active) in [
        (true, false, None),
        (false, true, None),
        (false, false, Some(PINNED)),
        (false, false, Some(NEWEST)),
    ] {
        let server = Server::start(HashMap::new())?;
        let root = tempfile::tempdir()?;
        let (disk, engine) = updater(root.path(), &server);
        if complete {
            record_complete(disk.as_ref(), PINNED)?;
        }
        if rejected {
            disk.reject(PINNED)?;
        }
        let state = State {
            current: active.map(str::to_owned),
            ..State::default()
        };
        disk.transition(&state)?;
        let result = engine.install_pinned(PINNED, &fixture.digest).await;
        let requests = finish_server(server)?;
        assert!(requests.is_empty(), "unexpected requests: {requests:?}");
        assert!(result.is_ok(), "pinned install failed: {result:?}");
        assert_eq!(disk.state()?, state);
        assert_eq!(disk.rejected(PINNED)?, rejected);
        assert_eq!(disk.version_path(PINNED).exists(), complete);
    }
    Ok(())
}

#[tokio::test]
async fn pinned_install_rejects_invalid_identity_before_requesting_files() -> TestResult {
    let fixture = pinned_fixture()?;
    let server = Server::start(HashMap::new())?;
    let root = tempfile::tempdir()?;
    let (_, engine) = updater(root.path(), &server);
    let wrong_version = engine.install_pinned("0.0.03", &fixture.digest).await;
    let wrong_digest = engine.install_pinned(PINNED, "invalid").await;
    let requests = finish_server(server)?;
    assert!(
        matches!(wrong_version, Err(Error::InvalidRelease)),
        "{wrong_version:?}"
    );
    assert!(
        matches!(wrong_digest, Err(Error::MissingDigest)),
        "{wrong_digest:?}"
    );
    assert!(requests.is_empty(), "unexpected requests: {requests:?}");
    Ok(())
}

#[test]
fn pinned_install_flags_require_each_other_and_bootstrap() -> TestResult {
    let digest = "a".repeat(64);
    for (arguments, missing) in [
        (
            vec!["--bootstrap", "--release", PINNED],
            "--digest <SHA256>",
        ),
        (
            vec!["--bootstrap", "--digest", &digest],
            "--release <VERSION>",
        ),
        (
            vec!["--release", PINNED, "--digest", &digest],
            "--bootstrap",
        ),
    ] {
        let output = Command::new(env!("CARGO_BIN_EXE_conductive"))
            .args(["update", "check"])
            .args(arguments)
            .output()?;
        assert_eq!(output.status.code(), Some(2));
        let stderr = String::from_utf8(output.stderr)?;
        assert!(
            stderr.contains("required arguments were not provided"),
            "{stderr}"
        );
        assert!(stderr.contains(missing), "{stderr}");
    }
    Ok(())
}

struct PinnedFixture {
    responses: HashMap<String, Vec<u8>>,
    digest: String,
    program_path: String,
    signature_path: String,
}

fn pinned_fixture() -> TestResult<PinnedFixture> {
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
    let manifest = release_manifest_bytes(PINNED, &digest)?;
    let signature_path = format!("/{}", manifest_signature_key(&manifest));
    let program_path = format!("/{}", program_archive_key(PINNED, &digest)?);
    Ok(PinnedFixture {
        responses: HashMap::from([
            (
                format!("/{LATEST_KEY}"),
                release_manifest_bytes(NEWEST, &"a".repeat(64))?,
            ),
            (
                signature_path.clone(),
                test_signer()?.sign(&manifest)?.to_vec(),
            ),
            (program_path.clone(), program),
            ("/sdk-helper".into(), helper),
        ]),
        digest,
        program_path,
        signature_path,
    })
}

async fn attempt_failed_install(
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

fn updater(root: &Path, server: &Server) -> (Arc<DiskStore>, Engine) {
    let disk = Arc::new(DiskStore::new(root.to_path_buf()));
    let engine = Engine {
        store: disk.clone(),
        client: Arc::new(server.client.clone()),
        installer: Arc::new(TarGzBinaryInstaller::new()),
        processes: Arc::new(SystemProcesses),
    };
    (disk, engine)
}

fn record_complete(disk: &DiskStore, version: &str) -> TestResult {
    let folder = disk.version_path(version);
    fs::create_dir_all(&folder)?;
    fs::write(folder.join(BINARY), b"previous program")?;
    disk.complete(version, &PartsList::new(vec![])?)?;
    Ok(())
}

fn finish_server(server: Server) -> TestResult<Vec<String>> {
    let requests = server
        .requests
        .lock()
        .map(|requests| requests.clone())
        .map_err(|_| "request lock poisoned");
    server.finish()?;
    Ok(requests?)
}
