//! Fetch release identities and verify signatures over their exact bytes.

use std::path::PathBuf;
use std::time::Duration;

use async_trait::async_trait;
use cli_release_interface::ReleaseAssetInfo;
use cnd_release::container_base::{
    container_base_archive_key, container_base_manifest_key, container_base_signature_key,
    read_container_base_manifest,
};
use cnd_release::manifest::{program_archive_key, release_manifest_bytes};
use cnd_release::signature::{manifest_signature_key, verify_manifest};
use cnd_release::version::{BINARY, LATEST_KEY, TARGET};
use cnd_runner_interface::computer::operations::ComputerRelease;
use reqwest::{Client, Response, StatusCode};

use crate::error::{Error, ErrorResultExt, Result};
use crate::http::{BodyError, bounded_body, client};
use crate::settings::ServerUrl;

use super::archives;
use super::ports::{BaseArchive, Releases, VerifiedRelease};
use super::program::{self, PROGRAM_LIMIT};

const MANIFEST_LIMIT: usize = 16 * 1024;
const SIGNATURE_BYTES: usize = 64;

/// Release client with a caller-supplied public key and private cache.
pub struct HttpReleases {
    client: Client,
    public_key: [u8; 32],
    cache: PathBuf,
}

impl HttpReleases {
    /// Set the trusted key, cache location, and download time limits.
    pub fn new(public_key: [u8; 32], cache: PathBuf) -> Result<Self> {
        Ok(Self {
            client: client(Duration::from_secs(60 * 60))?,
            public_key,
            cache,
        })
    }

    async fn get(&self, server: &ServerUrl, key: &str) -> Result<Response> {
        let Ok(response) = self.client.get(server.release_file(key)).send().await else {
            return Err(Error::ReleaseUnavailable);
        };
        Ok(response)
    }

    async fn file(&self, server: &ServerUrl, key: &str) -> Result<Response> {
        let response = self.get(server, key).await?;
        if response.status().is_success() {
            Ok(response)
        } else {
            Err(Error::ReleaseUnavailable)
        }
    }

    async fn manifest(&self, server: &ServerUrl, key: &str) -> Result<Vec<u8>> {
        read(self.file(server, key).await?, MANIFEST_LIMIT).await
    }

    async fn verify(&self, server: &ServerUrl, key: &str, manifest: &[u8]) -> Result<()> {
        let response = self.get(server, key).await?;
        match response.status() {
            StatusCode::NOT_FOUND | StatusCode::GONE => return Err(Error::ReleaseInvalid),
            status if !status.is_success() => return Err(Error::ReleaseUnavailable),
            _ => {}
        }
        let signature = read(response, SIGNATURE_BYTES).await?;
        if !verify_manifest(&self.public_key, manifest, &signature) {
            return Err(Error::ReleaseInvalid);
        }
        Ok(())
    }

    async fn cache_program(
        &self,
        server: &ServerUrl,
        release: &ComputerRelease,
    ) -> Result<PathBuf> {
        let key = valid(program_archive_key(&release.version, &release.digest))?;
        let executable = self
            .cache
            .join("programs")
            .join(&release.version)
            .join(&release.digest)
            .join(BINARY);
        if program::cached(&executable)? {
            return Ok(executable);
        }
        let response = self.file(server, &key).await?;
        let archive =
            archives::download(&self.cache, response, &release.digest, None, PROGRAM_LIMIT).await?;
        let destination = executable.clone();
        tokio::task::spawn_blocking(move || program::unpack(&archive, &destination))
            .await
            .internal()??;
        Ok(executable)
    }
}

#[async_trait]
impl Releases for HttpReleases {
    async fn program(&self, server: &ServerUrl, release: &ComputerRelease) -> Result<PathBuf> {
        let manifest = valid(release_manifest_bytes(&release.version, &release.digest))?;
        self.verify(server, &manifest_signature_key(&manifest), &manifest)
            .await?;
        self.cache_program(server, release).await
    }

    async fn base(&self, server: &ServerUrl, release: &ComputerRelease) -> Result<BaseArchive> {
        let key = valid(container_base_manifest_key(
            &release.version,
            &release.digest,
        ))?;
        let bytes = self.manifest(server, &key).await?;
        self.verify(server, &container_base_signature_key(&bytes), &bytes)
            .await?;
        let manifest = valid(read_container_base_manifest(
            &bytes,
            &release.version,
            &release.digest,
        ))?;
        let key = valid(container_base_archive_key(
            &release.version,
            &manifest.archive.sha256,
        ))?;
        let response = self.file(server, &key).await?;
        let path = archives::download(
            &self.cache,
            response,
            &manifest.archive.sha256,
            Some(manifest.archive.size),
            manifest.archive.size,
        )
        .await?;
        Ok(BaseArchive {
            path,
            image_id: manifest.image_id,
        })
    }

    async fn latest(&self, server: &ServerUrl) -> Result<VerifiedRelease> {
        let manifest = self.manifest(server, LATEST_KEY).await?;
        self.verify(server, &manifest_signature_key(&manifest), &manifest)
            .await?;
        let Ok(info) = serde_json::from_slice::<ReleaseAssetInfo>(&manifest) else {
            return Err(Error::ReleaseInvalid);
        };
        let Some(digest) = info.sha256 else {
            return Err(Error::ReleaseInvalid);
        };
        if info.binary != BINARY || info.target != TARGET {
            return Err(Error::ReleaseInvalid);
        }
        valid(program_archive_key(&info.version, &digest))?;
        Ok(VerifiedRelease(ComputerRelease {
            version: info.version,
            digest,
        }))
    }

    async fn verified_program(
        &self,
        server: &ServerUrl,
        release: &VerifiedRelease,
    ) -> Result<PathBuf> {
        self.cache_program(server, release.identity()).await
    }
}

fn valid<T>(result: cnd_release::error::Result<T>) -> Result<T> {
    match result {
        Ok(value) => Ok(value),
        Err(_) => Err(Error::ReleaseInvalid),
    }
}

async fn read(response: Response, limit: usize) -> Result<Vec<u8>> {
    match bounded_body(response, limit).await {
        Ok(bytes) => Ok(bytes),
        Err(BodyError::TooLarge) => Err(Error::ReleaseInvalid),
        Err(BodyError::Unavailable) => Err(Error::ReleaseUnavailable),
    }
}
