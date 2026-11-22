//! Download and verify a release, and download and verify single parts.

use cli_release_interface::ReleaseAssetInfo;
use cnd_release::files::sha256;
use cnd_release::parts::Part;
use cnd_release::signature::{manifest_signature_key, verify_manifest};
use cnd_release::version::{BINARY, DEVELOPMENT_VERSION, LATEST_KEY, TARGET, release_version};

use super::engine::Engine;
use super::error::{Error, ErrorResultExt, Result};
use super::ports::UpdateLock;

impl Engine {
    pub(super) async fn download(&self, running: &str, _lock: Box<dyn UpdateLock>) -> Result<()> {
        let manifest = self
            .fetch_release_file(LATEST_KEY.to_owned())
            .await
            .internal()?;
        let release: ReleaseAssetInfo = serde_json::from_slice(&manifest).internal()?;
        let version = release_version(&release.version).internal()?;
        if running != DEVELOPMENT_VERSION && version <= release_version(running).internal()? {
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
        let archive = self.client.download(&release).await.internal()?;
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
        if !sha256(&bytes).eq_ignore_ascii_case(&part.sha256) {
            return Err(Error::DigestMismatch {
                name: part.name.clone(),
            });
        }
        self.store.unpack(part, &bytes)
    }
}
