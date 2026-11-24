//! Canonical identity of a published program release.

use cli_release_interface::ReleaseAssetInfo;

use crate::error::{Error, ErrorResultExt, Result};
use crate::version::{BASE_URL, BINARY, TARGET, release_version};

/// Give the program archive key relative to the release server.
pub fn program_archive_key(version: &str, digest: &str) -> Result<String> {
    release_version(version)?;
    validate_digest(digest)?;
    Ok(format!(
        "releases/download/{BINARY}/{version}/{digest}/{}",
        program_archive_name(version)
    ))
}

/// Give the key of the exact signed newest-version JSON of a release, relative to the release server.
pub fn program_manifest_key(version: &str, digest: &str) -> Result<String> {
    release_version(version)?;
    validate_digest(digest)?;
    Ok(format!(
        "releases/download/{BINARY}/{version}/{digest}/{BINARY}-{version}-{TARGET}.json"
    ))
}

/// Serialize the exact program manifest bytes that the packager signs.
pub(super) fn release_manifest_bytes(version: &str, digest: &str) -> Result<Vec<u8>> {
    let key = program_archive_key(version, digest)?;
    serde_json::to_vec_pretty(&ReleaseAssetInfo {
        binary: BINARY.to_owned(),
        version: version.to_owned(),
        target: TARGET.to_owned(),
        asset_name: program_archive_name(version),
        download_url: format!("{BASE_URL}/{key}"),
        sha256: Some(digest.to_owned()),
    })
    .internal()
}

fn program_archive_name(version: &str) -> String {
    format!("{BINARY}-{version}-{TARGET}.tar.gz")
}

pub(super) fn validate_digest(digest: &str) -> Result<()> {
    if digest.len() != 64
        || !digest
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return Err(Error::InvalidDigest);
    }
    Ok(())
}
