//! Canonical identifiers and exact program manifest bytes.

use std::fs;

use cnd_release::error::Error;
use cnd_release::files::{DiskReleaseFiles, ReleaseFiles, sha256};
use cnd_release::manifest::{program_archive_key, release_manifest_bytes};
use cnd_release::parts::PartsList;
use cnd_release::signature::{ReleaseSigner, verify_release_signature};
use cnd_release::version::{BASE_URL, LATEST_KEY};

#[test]
fn packages_the_exact_manifest_for_the_program_archive() -> Result<(), Box<dyn std::error::Error>> {
    let directory = tempfile::tempdir()?;
    let program = directory.path().join("program");
    fs::write(&program, b"dummy executable\n")?;
    let output = directory.path().join("release");
    let signer = ReleaseSigner::from_pem(include_str!("fixtures/rfc8032-test-key.pem"))?;
    let files: &dyn ReleaseFiles = &DiskReleaseFiles;
    let metadata = files.package(
        "0.0.42",
        &program,
        &PartsList::new(vec![])?,
        &output,
        &signer,
    )?;
    let digest = metadata.sha256.ok_or("missing archive SHA-256 digest")?;
    assert_eq!(
        String::from_utf8(release_manifest_bytes("0.0.42", &digest)?)?,
        fs::read_to_string(output.join(LATEST_KEY))?
    );
    let key = program_archive_key("0.0.42", &digest)?;
    assert_eq!(metadata.download_url, format!("{BASE_URL}/{key}"));
    assert_eq!(sha256(&fs::read(output.join(key))?), digest);
    Ok(())
}

#[test]
fn release_identity_rejects_noncanonical_inputs() {
    let digest = "a".repeat(64);
    for result in [
        program_archive_key("0.0.01", &digest).map(|_| ()),
        release_manifest_bytes("0.0.01", &digest).map(|_| ()),
        verify_release_signature(&[0; 32], "0.0.01", &digest, &[]).map(|_| ()),
    ] {
        assert!(matches!(result, Err(Error::InvalidVersion { version }) if version == "0.0.01"));
    }
    for digest in ["a".repeat(63), "A".repeat(64), "g".repeat(64)] {
        for result in [
            program_archive_key("0.0.42", &digest).map(|_| ()),
            release_manifest_bytes("0.0.42", &digest).map(|_| ()),
            verify_release_signature(&[0; 32], "0.0.42", &digest, &[]).map(|_| ()),
        ] {
            assert!(matches!(result, Err(Error::InvalidDigest)), "{digest}");
        }
    }
}

#[test]
fn release_signature_binds_the_version_and_archive_digest() -> Result<(), Box<dyn std::error::Error>>
{
    let signer = ReleaseSigner::from_pem(include_str!("fixtures/rfc8032-test-key.pem"))?;
    let digest = "a".repeat(64);
    let manifest = release_manifest_bytes("0.0.42", &digest)?;
    let signature = signer.sign(&manifest)?;
    let key = signer.public_key();
    assert!(verify_release_signature(
        &key, "0.0.42", &digest, &signature
    )?);
    assert!(!verify_release_signature(
        &key, "0.0.43", &digest, &signature
    )?);
    assert!(!verify_release_signature(
        &key,
        "0.0.42",
        &"b".repeat(64),
        &signature
    )?);
    Ok(())
}
