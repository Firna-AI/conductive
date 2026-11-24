//! Signed container base image manifest and release server keys.

use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};
use crate::files::sha256;
use crate::manifest::validate_digest;
use crate::version::release_version;

const KEY_PREFIX: &str = "releases/download/container-base";
const MAX_ARCHIVE_SIZE: u64 = (1 << 53) - 1;
pub(super) const SCHEMA_VERSION: u32 = 1;

/// The program release installed in a container base image.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContainerBaseRelease {
    /// Canonical version of the installed program.
    pub version: String,
    /// SHA-256 digest of the program archive.
    pub digest: String,
}

/// The content identity and length of a Podman OCI archive.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContainerBaseArchive {
    /// SHA-256 digest of the OCI archive.
    pub sha256: String,
    /// Length of the OCI archive in bytes.
    pub size: u64,
}

/// Versioned manifest for a container base image.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ContainerBaseManifest {
    /// Format version. Writers use 1.
    pub schema_version: u32,
    /// Program release installed in the image.
    pub release: ContainerBaseRelease,
    /// OCI archive published for this image.
    pub archive: ContainerBaseArchive,
    /// Podman image ID with its sha256 prefix.
    pub image_id: String,
}

/// Give the OCI archive key relative to the release server.
pub fn container_base_archive_key(version: &str, archive_sha256: &str) -> Result<String> {
    release_version(version)?;
    validate_digest(archive_sha256)?;
    Ok(format!(
        "{KEY_PREFIX}/{version}/{archive_sha256}/container-base-{version}.tar"
    ))
}

/// Give the manifest key relative to the release server.
pub fn container_base_manifest_key(version: &str, release_digest: &str) -> Result<String> {
    release_version(version)?;
    validate_digest(release_digest)?;
    Ok(format!("{KEY_PREFIX}/{version}/{release_digest}.json"))
}

/// Give the detached signature key for the exact manifest bytes.
pub fn container_base_signature_key(manifest: &[u8]) -> String {
    format!("{KEY_PREFIX}/signatures/{}.sig", sha256(manifest))
}

/// Read a manifest for an expected program release. First verify the signature.
pub fn read_container_base_manifest(
    manifest: &[u8],
    expected_version: &str,
    expected_digest: &str,
) -> Result<ContainerBaseManifest> {
    release_version(expected_version)?;
    validate_digest(expected_digest)?;
    let manifest: ContainerBaseManifest = match serde_json::from_slice(manifest) {
        Ok(manifest) => manifest,
        Err(source) => return Err(Error::InvalidContainerBaseManifest { source }),
    };
    if manifest.schema_version != SCHEMA_VERSION {
        return Err(Error::UnsupportedContainerBaseSchema {
            version: manifest.schema_version,
        });
    }
    release_version(&manifest.release.version)?;
    validate_digest(&manifest.release.digest)?;
    if manifest.release.version != expected_version || manifest.release.digest != expected_digest {
        return Err(Error::ContainerBaseReleaseMismatch);
    }
    validate_digest(&manifest.archive.sha256)?;
    validate_archive_size(manifest.archive.size)?;
    validate_image_id(&manifest.image_id)?;
    Ok(manifest)
}

pub(super) fn validate_archive_size(size: u64) -> Result<()> {
    if size == 0 || size > MAX_ARCHIVE_SIZE {
        return Err(Error::InvalidContainerBaseArchiveSize { size });
    }
    Ok(())
}

pub(super) fn normalize_image_id(image_id: &str) -> Result<String> {
    let image_id = if image_id.starts_with("sha256:") {
        image_id.to_owned()
    } else {
        format!("sha256:{image_id}")
    };
    validate_image_id(&image_id)?;
    Ok(image_id)
}

fn validate_image_id(image_id: &str) -> Result<()> {
    if !image_id
        .strip_prefix("sha256:")
        .is_some_and(|digest| validate_digest(digest).is_ok())
    {
        return Err(Error::InvalidImageId);
    }
    Ok(())
}
