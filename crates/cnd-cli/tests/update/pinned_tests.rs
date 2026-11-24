//! Pinned installation against a local server and a signed release.

use std::collections::HashMap;
use std::fs;
use std::process::Command;

use cnd_cli::update::error::Error;
use cnd_cli::update::ports::{State, Store, UpdateEngine};
use cnd_release::version::BINARY;
use serde_json::{Value, json};

use crate::pinned_fixture::{
    NEWEST, PINNED, attempt_failed_install, finish_server, pinned_fixture, record_complete, updater,
};
use crate::support::{Server, TestResult};

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
            fixture.manifest_path,
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
    let expected_requests = [
        fixture.manifest_path.clone(),
        fixture.signature_path.clone(),
    ];
    let (result, requests) = attempt_failed_install(fixture, "404 Not Found").await?;
    assert!(matches!(result, Err(Error::InvalidSignature)), "{result:?}");
    assert_eq!(requests, expected_requests);
    Ok(())
}

#[tokio::test]
async fn pinned_install_refuses_a_missing_signature_without_staging() -> TestResult {
    for status in ["404 Not Found", "410 Gone"] {
        let mut fixture = pinned_fixture()?;
        fixture.responses.remove(&fixture.signature_path);
        let expected_requests = [
            fixture.manifest_path.clone(),
            fixture.signature_path.clone(),
        ];
        let (result, requests) = attempt_failed_install(fixture, status).await?;
        assert!(
            matches!(result, Err(Error::MissingSignature)),
            "{status}: {result:?}"
        );
        assert_eq!(requests, expected_requests, "{status}");
    }
    Ok(())
}

#[tokio::test]
async fn pinned_install_refuses_a_wrong_program_digest_without_staging() -> TestResult {
    let mut fixture = pinned_fixture()?;
    fixture
        .responses
        .insert(fixture.program_path.clone(), b"wrong archive".to_vec());
    let expected_requests = [
        fixture.manifest_path.clone(),
        fixture.signature_path.clone(),
        fixture.program_path.clone(),
    ];
    let (result, requests) = attempt_failed_install(fixture, "404 Not Found").await?;
    assert!(
        matches!(&result, Err(Error::DigestMismatch { name }) if name == BINARY),
        "{result:?}"
    );
    assert_eq!(requests, expected_requests);
    Ok(())
}

#[tokio::test]
async fn pinned_install_refuses_a_missing_manifest_without_staging() -> TestResult {
    for status in ["404 Not Found", "410 Gone"] {
        let mut fixture = pinned_fixture()?;
        fixture.responses.remove(&fixture.manifest_path);
        let manifest_path = fixture.manifest_path.clone();
        let (result, requests) = attempt_failed_install(fixture, status).await?;
        assert!(
            matches!(&result, Err(Error::MissingManifest { version }) if version == PINNED),
            "{status}: {result:?}"
        );
        assert_eq!(requests, [manifest_path], "{status}");
    }
    Ok(())
}

#[tokio::test]
async fn pinned_install_refuses_a_signed_manifest_with_a_different_identity() -> TestResult {
    let wrong_digest = "b".repeat(64);
    for (field, value) in [
        ("version", NEWEST),
        ("sha256", &wrong_digest),
        ("binary", "other-program"),
        ("target", "other-target"),
    ] {
        let mut fixture = pinned_fixture()?;
        let mut manifest: Value =
            serde_json::from_slice(&fixture.responses[&fixture.manifest_path])?;
        manifest[field] = json!(value);
        fixture.replace_manifest(serde_json::to_vec(&manifest)?)?;
        let expected_requests = [
            fixture.manifest_path.clone(),
            fixture.signature_path.clone(),
        ];
        let (result, requests) = attempt_failed_install(fixture, "404 Not Found").await?;
        assert!(
            matches!(result, Err(Error::InvalidRelease)),
            "{field}: {result:?}"
        );
        assert_eq!(requests, expected_requests, "{field}");
    }
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
