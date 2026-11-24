//! Canonical identifiers and exact program manifest bytes.

use std::fs;
use std::path::{Path, PathBuf};

use cli_release_interface::ReleaseAssetInfo;
use cnd_release::error::Error;
use cnd_release::files::{DiskReleaseFiles, ReleaseFiles, sha256};
use cnd_release::manifest::{program_archive_key, program_manifest_key};
use cnd_release::parts::PartsList;
use cnd_release::signature::{ReleaseSigner, manifest_signature_key, verify_manifest};
use cnd_release::version::{BASE_URL, LATEST_KEY};

#[test]
fn packages_the_exact_manifest_for_the_program_archive() -> Result<(), Box<dyn std::error::Error>> {
    let directory = tempfile::tempdir()?;
    let (output, metadata, signer) = package_program(directory.path())?;
    let digest = metadata.sha256.ok_or("missing archive SHA-256 digest")?;
    let manifest_key = program_manifest_key("0.0.42", &digest)?;
    assert_eq!(
        manifest_key,
        format!(
            "releases/download/conductive/0.0.42/{digest}/conductive-0.0.42-x86_64-unknown-linux-musl.json"
        )
    );
    let manifest_path = output.join(manifest_key);
    assert!(
        manifest_path.is_file(),
        "missing immutable program manifest"
    );
    let manifest = fs::read(manifest_path)?;
    assert_eq!(manifest, fs::read(output.join(LATEST_KEY))?);
    let signature = fs::read(output.join(manifest_signature_key(&manifest)))?;
    assert!(verify_manifest(&signer.public_key(), &manifest, &signature));
    let key = program_archive_key("0.0.42", &digest)?;
    assert_eq!(metadata.download_url, format!("{BASE_URL}/{key}"));
    assert_eq!(sha256(&fs::read(output.join(key))?), digest);
    Ok(())
}

#[test]
fn release_identity_rejects_noncanonical_inputs() {
    let digest = "a".repeat(64);
    for result in [
        program_archive_key("0.0.01", &digest),
        program_manifest_key("0.0.01", &digest),
    ] {
        assert!(matches!(result, Err(Error::InvalidVersion { version }) if version == "0.0.01"));
    }
    for digest in ["a".repeat(63), "A".repeat(64), "g".repeat(64)] {
        for result in [
            program_archive_key("0.0.42", &digest),
            program_manifest_key("0.0.42", &digest),
        ] {
            assert!(matches!(result, Err(Error::InvalidDigest)), "{digest}");
        }
    }
}

#[test]
fn release_signature_binds_the_version_and_archive_digest() -> Result<(), Box<dyn std::error::Error>>
{
    let directory = tempfile::tempdir()?;
    let (output, metadata, signer) = package_program(directory.path())?;
    let digest = metadata.sha256.ok_or("missing archive SHA-256 digest")?;
    let manifest = fs::read_to_string(output.join(program_manifest_key("0.0.42", &digest)?))?;
    let signature = fs::read(output.join(manifest_signature_key(manifest.as_bytes())))?;
    let key = signer.public_key();
    assert!(verify_manifest(&key, manifest.as_bytes(), &signature));
    let different_version = manifest.replace("\"0.0.42\"", "\"0.0.43\"");
    let different_digest =
        manifest.replace(&format!("\"{digest}\""), &format!("\"{}\"", "b".repeat(64)));
    assert!(!verify_manifest(
        &key,
        different_version.as_bytes(),
        &signature
    ));
    assert!(!verify_manifest(
        &key,
        different_digest.as_bytes(),
        &signature
    ));
    Ok(())
}

fn package_program(
    directory: &Path,
) -> Result<(PathBuf, ReleaseAssetInfo, ReleaseSigner), Box<dyn std::error::Error>> {
    let program = directory.join("program");
    fs::write(&program, b"dummy executable\n")?;
    let output = directory.join("release");
    let signer = ReleaseSigner::from_pem(include_str!("fixtures/rfc8032-test-key.pem"))?;
    let files: &dyn ReleaseFiles = &DiskReleaseFiles;
    let metadata = files.package(
        "0.0.42",
        &program,
        &PartsList::new(vec![])?,
        &output,
        &signer,
    )?;
    Ok((output, metadata, signer))
}
