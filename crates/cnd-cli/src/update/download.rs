//! Download and verify a release, and download and verify single parts.

use cli_release_interface::ReleaseAssetInfo;
use cnd_release::error::Error::{InvalidDigest, InvalidVersion};
use cnd_release::files::sha256;
use cnd_release::manifest::{program_archive_key, release_manifest_bytes};
use cnd_release::parts::Part;
use cnd_release::signature::{manifest_signature_key, verify_manifest};
use cnd_release::version::{BINARY, DEVELOPMENT_VERSION, LATEST_KEY, TARGET, release_version};

use super::engine::Engine;
use super::error::{Error, ErrorResultExt, Result};
use super::ports::UpdateLock;

/// Source of the manifest and version to stage.
pub(super) enum ReleaseSelection<'a> {
    Latest(&'a str),
    Pinned { version: &'a str, digest: &'a str },
}

impl Engine {
    pub(super) async fn download(
        &self,
        selection: ReleaseSelection<'_>,
        _lock: Box<dyn UpdateLock>,
    ) -> Result<()> {
        let manifest = match selection {
            ReleaseSelection::Latest(_) => self
                .fetch_release_file(LATEST_KEY.to_owned())
                .await
                .internal()?,
            ReleaseSelection::Pinned { version, digest } => pinned_manifest(version, digest)?,
        };
        let mut release: ReleaseAssetInfo = serde_json::from_slice(&manifest).internal()?;
        let version = release_version(&release.version).internal()?;
        if let ReleaseSelection::Latest(running) = selection
            && running != DEVELOPMENT_VERSION
            && version <= release_version(running).internal()?
        {
            return Ok(());
        }
        if release.binary != BINARY || release.target != TARGET {
            return Err(Error::InvalidRelease);
        }
        let digest = release.sha256.as_deref().ok_or(Error::MissingDigest)?;
        if digest.len() != 64 || !digest.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return Err(Error::MissingDigest);
        }
        if self.store.versions()?.contains(&release.version)
            || self.store.rejected(&release.version)?
        {
            return Ok(());
        }
        let state = self.store.state()?;
        if let Some(current) = state.current
            && version <= release_version(&current).internal()?
        {
            return Ok(());
        }
        self.check_signature(&manifest).await?;
        let pinned = matches!(selection, ReleaseSelection::Pinned { .. });
        if pinned {
            release.download_url = program_archive_key(&release.version, digest).internal()?;
        }
        let archive = self.client.download(&release).await.internal()?;
        if pinned {
            check_digest(&archive, digest, BINARY)?;
        }
        self.store.prepare(&release.version)?;
        let executable = self.store.version_path(&release.version).join(BINARY);
        self.installer
            .install(
                &archive,
                BINARY,
                &executable,
                Some(digest),
                &release.asset_name,
            )
            .internal()?;
        let parts = self.processes.inspect(&executable, &release.version)?;
        parts.validate().internal()?;
        for part in &parts.parts {
            if self.store.has_part(part)? {
                continue;
            }
            self.download_part(&release.version, part).await?;
        }
        self.store.complete(&release.version, &parts)
    }

    /// Fetch exact bytes. The release client's `latest` method parses the JSON.
    async fn fetch_release_file(&self, key: String) -> cli_updater::Result<Vec<u8>> {
        self.client
            .download(&ReleaseAssetInfo {
                binary: BINARY.to_owned(),
                version: String::new(),
                target: TARGET.to_owned(),
                asset_name: key.clone(),
                download_url: key,
                sha256: None,
            })
            .await
    }

    async fn check_signature(&self, manifest: &[u8]) -> Result<()> {
        let result = self
            .fetch_release_file(manifest_signature_key(manifest))
            .await;
        let signature = match result {
            Err(cli_updater::Error::ReleaseServerStatus {
                status: 404 | 410, ..
            }) => {
                return Err(Error::MissingSignature);
            }
            result => result.internal()?,
        };
        if !verify_manifest(self.client.verification_key(), manifest, &signature) {
            return Err(Error::InvalidSignature);
        }
        Ok(())
    }

    /// Download one part, refuse a wrong digest, and unpack it.
    pub(super) async fn download_part(&self, version: &str, part: &Part) -> Result<()> {
        let asset = ReleaseAssetInfo {
            binary: part.name.clone(),
            version: version.to_owned(),
            target: TARGET.to_owned(),
            asset_name: part.name.clone(),
            download_url: part.url.clone(),
            sha256: Some(part.sha256.clone()),
        };
        let bytes = self.client.download(&asset).await.internal()?;
        check_digest(&bytes, &part.sha256, &part.name)?;
        self.store.unpack(part, &bytes)
    }
}

fn pinned_manifest(version: &str, digest: &str) -> Result<Vec<u8>> {
    match release_manifest_bytes(version, digest) {
        Err(InvalidVersion { .. }) => Err(Error::InvalidRelease),
        Err(InvalidDigest) => Err(Error::MissingDigest),
        result => result.internal(),
    }
}

fn check_digest(bytes: &[u8], digest: &str, name: &str) -> Result<()> {
    if !sha256(bytes).eq_ignore_ascii_case(digest) {
        return Err(Error::DigestMismatch {
            name: name.to_owned(),
        });
    }
    Ok(())
}
