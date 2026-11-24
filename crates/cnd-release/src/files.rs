//! Deterministic archive creation and release filesystem boundary.

use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::Path;

use cli_release_interface::ReleaseAssetInfo;
use flate2::{Compression, GzBuilder};
use sha2::{Digest, Sha256};
use tar::{Builder, Header};

use crate::container_base::{
    ContainerBaseArchive, ContainerBaseManifest, ContainerBaseRelease, SCHEMA_VERSION,
    container_base_archive_key, container_base_manifest_key, container_base_signature_key,
    normalize_image_id, validate_archive_size,
};
use crate::error::{ErrorResultExt, Result};
use crate::manifest::{program_archive_key, program_manifest_key, release_manifest_bytes};
use crate::parts::PartsList;
use crate::signature::{ReleaseSigner, manifest_signature_key};
use crate::version::{BINARY, LATEST_KEY, TARGET, release_version};

/// Filesystem operations used by the release command and build script.
pub trait ReleaseFiles {
    /// Read and validate a typed parts file.
    fn read_parts(&self, path: &Path) -> Result<PartsList>;
    /// Write a validated parts file.
    fn write_parts(&self, path: &Path, parts: &PartsList) -> Result<()>;
    /// Read metadata for the newest-version comparison.
    fn read_metadata(&self, path: &Path) -> Result<ReleaseAssetInfo>;
    /// Write the immutable release files, then the local newest-version JSON.
    fn package(
        &self,
        version: &str,
        program: &Path,
        parts: &PartsList,
        output: &Path,
        signer: &ReleaseSigner,
    ) -> Result<ReleaseAssetInfo>;
    /// Write an OCI archive, its signature, and its manifest under the output folder.
    /// Keep the input archive unchanged during this call.
    fn write_container_base(
        &self,
        version: &str,
        release_digest: &str,
        archive: &Path,
        image_id: &str,
        output: &Path,
        signer: &ReleaseSigner,
    ) -> Result<ContainerBaseManifest>;
}

/// Release files stored on the local filesystem.
pub struct DiskReleaseFiles;

impl ReleaseFiles for DiskReleaseFiles {
    fn read_parts(&self, path: &Path) -> Result<PartsList> {
        let list: PartsList = serde_json::from_slice(&fs::read(path).internal()?).internal()?;
        list.validate()?;
        Ok(list)
    }

    fn write_parts(&self, path: &Path, parts: &PartsList) -> Result<()> {
        parts.validate()?;
        write_file(path, &serde_json::to_vec_pretty(parts).internal()?)
    }

    fn read_metadata(&self, path: &Path) -> Result<ReleaseAssetInfo> {
        serde_json::from_slice(&fs::read(path).internal()?).internal()
    }

    fn write_container_base(
        &self,
        version: &str,
        release_digest: &str,
        archive: &Path,
        image_id: &str,
        output: &Path,
        signer: &ReleaseSigner,
    ) -> Result<ContainerBaseManifest> {
        let manifest_key = container_base_manifest_key(version, release_digest)?;
        let image_id = normalize_image_id(image_id)?;
        fs::create_dir_all(output).internal()?;
        let staging = tempfile::tempdir_in(output).internal()?;
        let staged_archive = staging.path().join("archive.tar");
        let archive = stage_container_archive(archive, &staged_archive)?;
        let archive_key = container_base_archive_key(version, &archive.sha256)?;
        let manifest = ContainerBaseManifest {
            schema_version: SCHEMA_VERSION,
            release: ContainerBaseRelease {
                version: version.to_owned(),
                digest: release_digest.to_owned(),
            },
            archive,
            image_id,
        };
        let bytes = serde_json::to_vec_pretty(&manifest).internal()?;
        let signature = signer.sign(&bytes)?;
        let staged_signature = staging.path().join("signature.sig");
        let staged_manifest = staging.path().join("manifest.json");
        fs::write(&staged_signature, signature).internal()?;
        fs::write(&staged_manifest, &bytes).internal()?;
        publish_file(&staged_archive, &output.join(archive_key))?;
        publish_file(
            &staged_signature,
            &output.join(container_base_signature_key(&bytes)),
        )?;
        publish_file(&staged_manifest, &output.join(manifest_key))?;
        Ok(manifest)
    }

    fn package(
        &self,
        version: &str,
        program: &Path,
        parts: &PartsList,
        output: &Path,
        signer: &ReleaseSigner,
    ) -> Result<ReleaseAssetInfo> {
        release_version(version)?;
        parts.validate()?;
        let archive = program_archive(&fs::read(program).internal()?)?;
        let digest = sha256(&archive);
        let key = program_archive_key(version, &digest)?;
        let manifest_key = program_manifest_key(version, &digest)?;
        let manifest = release_manifest_bytes(version, &digest)?;
        let metadata = serde_json::from_slice(&manifest).internal()?;
        let prefix = format!("releases/download/{BINARY}/{version}");
        let signature = signer.sign(&manifest)?;
        write_file(&output.join(&key), &archive)?;
        let parts_bytes = serde_json::to_vec_pretty(parts).internal()?;
        let parts_key = format!(
            "{prefix}/{}/parts-{version}-{TARGET}.json",
            sha256(&parts_bytes)
        );
        write_file(&output.join(parts_key), &parts_bytes)?;
        write_file(&output.join(manifest_signature_key(&manifest)), &signature)?;
        write_file(&output.join(manifest_key), &manifest)?;
        write_file(&output.join(LATEST_KEY), &manifest)?;
        Ok(metadata)
    }
}

fn write_file(path: &Path, bytes: &[u8]) -> Result<()> {
    create_parent(path)?;
    fs::write(path, bytes).internal()
}

fn publish_file(staged: &Path, path: &Path) -> Result<()> {
    create_parent(path)?;
    fs::rename(staged, path).internal()
}

fn create_parent(path: &Path) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).internal()?;
    }
    Ok(())
}

fn stage_container_archive(source: &Path, staged: &Path) -> Result<ContainerBaseArchive> {
    fs::copy(source, staged).internal()?;
    let mut archive = BufReader::with_capacity(64 * 1024, File::open(staged).internal()?);
    let mut digest = Sha256::new();
    let mut size = 0;
    loop {
        let bytes = archive.fill_buf().internal()?;
        let length = bytes.len();
        if length == 0 {
            break;
        }
        digest.update(bytes);
        archive.consume(length);
        size += length as u64;
    }
    validate_archive_size(size)?;
    Ok(ContainerBaseArchive {
        sha256: hex_digest(&digest.finalize()),
        size,
    })
}

/// Digest of release bytes, suitable for a filename and updater metadata.
pub fn sha256(bytes: &[u8]) -> String {
    hex_digest(&Sha256::digest(bytes))
}

fn hex_digest(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn program_archive(program: &[u8]) -> Result<Vec<u8>> {
    let gzip = GzBuilder::new()
        .mtime(0)
        .write(Vec::new(), Compression::default());
    let mut archive = Builder::new(gzip);
    let mut header = Header::new_gnu();
    header.set_size(program.len() as u64);
    header.set_mode(0o755);
    header.set_uid(0);
    header.set_gid(0);
    header.set_mtime(0);
    header.set_cksum();
    archive
        .append_data(&mut header, BINARY, program)
        .internal()?;
    archive.into_inner().internal()?.finish().internal()
}
