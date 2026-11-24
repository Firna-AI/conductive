//! Container base manifest and publication through the disk boundary.

use std::fs;
use std::process::Command;

use cnd_release::container_base::{
    container_base_archive_key, container_base_manifest_key, container_base_signature_key,
    read_container_base_manifest,
};
use cnd_release::error::Error;
use cnd_release::files::{DiskReleaseFiles, ReleaseFiles};
use cnd_release::signature::{ReleaseSigner, verify_manifest};
use serde_json::{Value, json};

const VERSION: &str = "0.0.42";
const RELEASE_DIGEST: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ARCHIVE_SHA256: &str = "06395157e32eb18527ec909c5d6db3c82f0ba82f55ce972b8b4803f5296c93b8";
const IMAGE_DIGEST: &str = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

#[test]
fn container_base_keys_bind_the_release_and_the_content() -> Result<(), Box<dyn std::error::Error>>
{
    assert_eq!(
        container_base_archive_key(VERSION, ARCHIVE_SHA256)?,
        format!(
            "releases/download/container-base/0.0.42/{ARCHIVE_SHA256}/container-base-0.0.42.tar"
        )
    );
    assert_eq!(
        container_base_manifest_key(VERSION, RELEASE_DIGEST)?,
        format!("releases/download/container-base/0.0.42/{RELEASE_DIGEST}.json")
    );
    assert_eq!(
        container_base_signature_key(b"manifest"),
        "releases/download/container-base/signatures/05b3abf2579a5eb66403cd78be557fd860633a1fe2103c7642030defe32c657f.sig"
    );
    assert!(matches!(
        container_base_archive_key("0.0.01", ARCHIVE_SHA256),
        Err(Error::InvalidVersion { .. })
    ));
    assert!(matches!(
        container_base_manifest_key(VERSION, "bad digest"),
        Err(Error::InvalidDigest)
    ));
    Ok(())
}

#[test]
fn container_base_reader_accepts_added_fields() -> Result<(), Box<dyn std::error::Error>> {
    let mut manifest = manifest_json();
    manifest["added"] = json!(true);
    manifest["release"]["added"] = json!(true);
    manifest["archive"]["added"] = json!(true);
    let result =
        read_container_base_manifest(&serde_json::to_vec(&manifest)?, VERSION, RELEASE_DIGEST);
    assert!(result.is_ok(), "could not read manifest: {result:?}");
    let decoded = result?;
    assert_eq!(decoded.schema_version, 1);
    assert_eq!(decoded.release.version, VERSION);
    assert_eq!(decoded.release.digest, RELEASE_DIGEST);
    assert_eq!(decoded.archive.size, 16);
    assert_eq!(decoded.archive.sha256, ARCHIVE_SHA256);
    assert_eq!(decoded.image_id, format!("sha256:{IMAGE_DIGEST}"));
    Ok(())
}

#[test]
fn container_base_reader_refuses_an_unsupported_schema_or_invalid_fields()
-> Result<(), Box<dyn std::error::Error>> {
    let read = |manifest: &Value| {
        let bytes = serde_json::to_vec(manifest)?;
        Ok::<_, serde_json::Error>(read_container_base_manifest(
            &bytes,
            VERSION,
            RELEASE_DIGEST,
        ))
    };
    let mut manifest = manifest_json();
    manifest["schemaVersion"] = json!(2);
    assert!(matches!(
        read(&manifest)?,
        Err(Error::UnsupportedContainerBaseSchema { version: 2 })
    ));

    for (field, different) in [("version", "0.0.43"), ("digest", IMAGE_DIGEST)] {
        let mut manifest = manifest_json();
        manifest["release"][field] = json!(different);
        assert!(
            matches!(read(&manifest)?, Err(Error::ContainerBaseReleaseMismatch)),
            "{field}"
        );
    }
    let mut manifest = manifest_json();
    manifest["archive"]["sha256"] = json!(ARCHIVE_SHA256.to_ascii_uppercase());
    assert!(matches!(read(&manifest)?, Err(Error::InvalidDigest)));

    for size in [0, 1_u64 << 53] {
        let mut manifest = manifest_json();
        manifest["archive"]["size"] = json!(size);
        assert!(matches!(
            read(&manifest)?,
            Err(Error::InvalidContainerBaseArchiveSize { size: actual }) if actual == size
        ));
    }
    let mut manifest = manifest_json();
    manifest["imageId"] = json!(IMAGE_DIGEST);
    assert!(matches!(read(&manifest)?, Err(Error::InvalidImageId)));
    assert!(matches!(
        read_container_base_manifest(b"{}", VERSION, RELEASE_DIGEST),
        Err(Error::InvalidContainerBaseManifest { .. })
    ));
    Ok(())
}

#[test]
fn writes_a_signed_container_base_manifest_and_archive_on_retry()
-> Result<(), Box<dyn std::error::Error>> {
    let directory = tempfile::tempdir()?;
    let input = directory.path().join("input.tar");
    fs::write(&input, b"test OCI archive")?;
    let output = directory.path().join("release");
    let signer = ReleaseSigner::from_pem(include_str!("fixtures/rfc8032-test-key.pem"))?;
    let files: &dyn ReleaseFiles = &DiskReleaseFiles;
    let image_id = format!("sha256:{IMAGE_DIGEST}");

    for id in [IMAGE_DIGEST, &image_id] {
        let result =
            files.write_container_base(VERSION, RELEASE_DIGEST, &input, id, &output, &signer);
        assert!(result.is_ok(), "could not write container base: {result:?}");
        let manifest = result?;
        let bytes = fs::read(output.join(container_base_manifest_key(VERSION, RELEASE_DIGEST)?))?;
        let signature = fs::read(output.join(container_base_signature_key(&bytes)))?;
        assert_eq!(signature.len(), 64);
        assert!(verify_manifest(&signer.public_key(), &bytes, &signature));
        assert_eq!(bytes, pretty_manifest_json().as_bytes());
        assert_eq!(
            read_container_base_manifest(&bytes, VERSION, RELEASE_DIGEST)?,
            manifest
        );
        let archive = output.join(container_base_archive_key(VERSION, ARCHIVE_SHA256)?);
        assert_eq!(fs::read(archive)?, b"test OCI archive");
    }
    Ok(())
}

#[test]
fn container_base_writer_refuses_an_empty_archive_or_invalid_image_id()
-> Result<(), Box<dyn std::error::Error>> {
    let directory = tempfile::tempdir()?;
    let input = directory.path().join("input.tar");
    fs::write(&input, [])?;
    let output = directory.path().join("release");
    let signer = ReleaseSigner::from_pem(include_str!("fixtures/rfc8032-test-key.pem"))?;
    let empty = DiskReleaseFiles.write_container_base(
        VERSION,
        RELEASE_DIGEST,
        &input,
        IMAGE_DIGEST,
        &output,
        &signer,
    );
    assert!(matches!(
        empty,
        Err(Error::InvalidContainerBaseArchiveSize { size: 0 })
    ));
    assert!(!output.join("releases").exists());
    fs::write(&input, b"test OCI archive")?;
    let invalid = DiskReleaseFiles.write_container_base(
        VERSION,
        RELEASE_DIGEST,
        &input,
        "wrong-id",
        &output,
        &signer,
    );
    assert!(matches!(invalid, Err(Error::InvalidImageId)));
    assert!(!output.join("releases").exists());
    Ok(())
}

#[test]
fn published_container_archive_keeps_its_bytes_when_the_input_is_overwritten()
-> Result<(), Box<dyn std::error::Error>> {
    let directory = tempfile::tempdir()?;
    let input = directory.path().join("input.tar");
    fs::write(&input, b"test OCI archive")?;
    let output = directory.path().join("release");
    let signer = ReleaseSigner::from_pem(include_str!("fixtures/rfc8032-test-key.pem"))?;
    let manifest = DiskReleaseFiles.write_container_base(
        VERSION,
        RELEASE_DIGEST,
        &input,
        IMAGE_DIGEST,
        &output,
        &signer,
    )?;

    fs::write(&input, b"another archive")?;
    let archive = output.join(container_base_archive_key(
        VERSION,
        &manifest.archive.sha256,
    )?);
    assert_eq!(manifest.archive.sha256, ARCHIVE_SHA256);
    assert_eq!(fs::read(archive)?, b"test OCI archive");
    Ok(())
}

#[test]
fn container_base_command_requires_the_deploy_key() -> Result<(), Box<dyn std::error::Error>> {
    let directory = tempfile::tempdir()?;
    let output = Command::new(env!("CARGO_BIN_EXE_cnd-release"))
        .current_dir(directory.path())
        .env_remove("CONDUCTIVE_RELEASE_SIGNING_KEY")
        .args([
            "container-base",
            "--version",
            VERSION,
            "--digest",
            RELEASE_DIGEST,
            "--archive",
            "input.tar",
            "--image-id",
            IMAGE_DIGEST,
            "--output",
            "output",
        ])
        .output()?;
    assert_eq!(output.status.code(), Some(1));
    assert_eq!(
        String::from_utf8(output.stderr)?,
        format!("{}\n", Error::MissingSigningKey)
    );
    assert!(!directory.path().join("output").exists());
    Ok(())
}

fn manifest_json() -> Value {
    json!({
        "schemaVersion": 1,
        "release": { "version": VERSION, "digest": RELEASE_DIGEST },
        "archive": { "sha256": ARCHIVE_SHA256, "size": 16 },
        "imageId": format!("sha256:{IMAGE_DIGEST}"),
    })
}

fn pretty_manifest_json() -> String {
    format!(
        r#"{{
  "schemaVersion": 1,
  "release": {{
    "version": "{VERSION}",
    "digest": "{RELEASE_DIGEST}"
  }},
  "archive": {{
    "sha256": "{ARCHIVE_SHA256}",
    "size": 16
  }},
  "imageId": "sha256:{IMAGE_DIGEST}"
}}"#
    )
}
