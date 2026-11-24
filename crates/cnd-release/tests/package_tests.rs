//! Disk integration with signed manifests and the older updater archive installer.

#![expect(
    clippy::unwrap_used,
    reason = "A failed test setup must stop the test."
)]

use std::fs;
use std::process::Command;

use cli_release_interface::ReleaseAssetInfo;
use cli_updater::{BinaryInstaller, TarGzBinaryInstaller};
use cnd_release::files::{DiskReleaseFiles, ReleaseFiles};
use cnd_release::manifest::program_manifest_key;
use cnd_release::parts::{Part, PartsList};
use cnd_release::signature::{ReleaseSigner, manifest_signature_key, verify_manifest};
use cnd_release::version::{BASE_URL, BINARY, LATEST_KEY, TARGET};

#[test]
fn signed_release_is_reproducible_and_readable_by_the_older_updater() {
    let directory = tempfile::tempdir().unwrap();
    let program = directory.path().join("input");
    fs::write(&program, b"dummy executable\n").unwrap();
    let parts = PartsList::new(vec![
        Part {
            name: "runner".to_owned(),
            url: format!("{BASE_URL}/runner-{}.tar.gz", "a".repeat(64)),
            sha256: "a".repeat(64),
        },
        Part {
            name: "node".to_owned(),
            url: "https://nodejs.org/dist/v24.22.2/node-v24.22.2-linux-x64.tar.gz".to_owned(),
            sha256: "b".repeat(64),
        },
    ])
    .unwrap();
    let first = directory.path().join("first");
    let second = directory.path().join("second");
    let files: &dyn ReleaseFiles = &DiskReleaseFiles;
    let signer = ReleaseSigner::from_pem(include_str!("fixtures/rfc8032-test-key.pem")).unwrap();
    files
        .package("0.0.42", &program, &parts, &first, &signer)
        .unwrap();
    files
        .package("0.0.42", &program, &parts, &second, &signer)
        .unwrap();
    let metadata_bytes = fs::read(first.join(LATEST_KEY)).unwrap();
    let signature_key = manifest_signature_key(&metadata_bytes);
    let signature = fs::read(first.join(&signature_key)).unwrap();
    assert_eq!(signature.len(), 64);
    assert!(verify_manifest(
        &signer.public_key(),
        &metadata_bytes,
        &signature
    ));
    assert_eq!(signature, fs::read(second.join(signature_key)).unwrap());
    let metadata: ReleaseAssetInfo = serde_json::from_slice(&metadata_bytes).unwrap();
    assert_eq!(metadata.binary, BINARY);
    assert_eq!(metadata.version, "0.0.42");
    assert_eq!(metadata.target, TARGET);
    assert_eq!(
        metadata.asset_name,
        format!("conductive-0.0.42-{TARGET}.tar.gz")
    );
    let digest = metadata.sha256.as_ref().unwrap();
    assert_eq!(digest.len(), 64);
    assert_eq!(
        metadata.download_url,
        format!(
            "{BASE_URL}/releases/download/conductive/0.0.42/{digest}/{}",
            metadata.asset_name
        )
    );
    let key = metadata
        .download_url
        .strip_prefix(&format!("{BASE_URL}/"))
        .unwrap();
    let archive = fs::read(first.join(key)).unwrap();
    assert_eq!(archive, fs::read(second.join(key)).unwrap());
    assert_eq!(metadata_bytes, fs::read(second.join(LATEST_KEY)).unwrap());
    let manifest_path = first.join(program_manifest_key("0.0.42", digest).unwrap());
    let part_objects: Vec<_> = fs::read_dir(first.join("releases/download/conductive/0.0.42"))
        .unwrap()
        .flat_map(|entry| fs::read_dir(entry.unwrap().path()).unwrap())
        .map(|entry| entry.unwrap().path())
        .filter(|path| path.extension().unwrap() == "json" && *path != manifest_path)
        .collect();
    assert_eq!(part_objects.len(), 1);
    assert_eq!(files.read_parts(&part_objects[0]).unwrap(), parts);
    let installed = directory.path().join(BINARY);
    fs::write(&installed, b"old program").unwrap();
    TarGzBinaryInstaller::new()
        .install(
            &archive,
            BINARY,
            &installed,
            metadata.sha256.as_deref(),
            &metadata.asset_name,
        )
        .unwrap();
    assert_eq!(fs::read(installed).unwrap(), b"dummy executable\n");
}

#[test]
fn package_reports_a_missing_deploy_key_before_writing_release_files() {
    let directory = tempfile::tempdir().unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_cnd-release"))
        .current_dir(directory.path())
        .env_remove("CONDUCTIVE_RELEASE_SIGNING_KEY")
        .args([
            "package",
            "--version",
            "0.0.42",
            "--program",
            "conductive",
            "--parts",
            "parts.json",
            "--output",
            "output",
        ])
        .output()
        .unwrap();
    assert_eq!(output.status.code(), Some(1));
    assert_eq!(
        String::from_utf8(output.stderr).unwrap(),
        "[cnd-release] set CONDUCTIVE_RELEASE_SIGNING_KEY to the Ed25519 private key in PKCS#8 PEM format\n"
    );
    assert!(!directory.path().join("output").exists());
}
