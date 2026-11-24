//! Effects for verified release bytes and durable image imports.

use std::path::{Path, PathBuf};

use async_trait::async_trait;
use cnd_runner_interface::computer::operations::ComputerRelease;
use tempfile::TempPath;

use crate::error::Result;
use crate::settings::ServerUrl;

/// An authenticated newest-version document's release identity.
#[derive(Debug, Clone)]
pub struct VerifiedRelease(pub(crate) ComputerRelease);

impl VerifiedRelease {
    /// The release version and SHA-256 digest of its program archive.
    pub fn identity(&self) -> &ComputerRelease {
        &self.0
    }
}

/// An authenticated OCI archive. Its file is removed when the value is dropped.
pub struct BaseArchive {
    pub(super) path: TempPath,
    pub(super) image_id: String,
}

impl BaseArchive {
    /// Temporary archive path for the native container engine.
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Signed Podman image ID of the archive.
    pub fn image_id(&self) -> &str {
        &self.image_id
    }
}

/// Obtain files authenticated with the release public key.
#[cfg_attr(test, unimock::unimock(api = ReleasesMock))]
#[async_trait]
pub trait Releases: Send + Sync {
    /// Check the pinned manifest signature and cache its verified program.
    async fn program(&self, server: &ServerUrl, release: &ComputerRelease) -> Result<PathBuf>;
    /// Authenticate the signed base manifest and stream its verified archive to disk.
    async fn base(&self, server: &ServerUrl, release: &ComputerRelease) -> Result<BaseArchive>;
    /// Fetch and authenticate the exact current newest-version document.
    async fn latest(&self, server: &ServerUrl) -> Result<VerifiedRelease>;
    /// Fetch a program identified by a verified newest-version document.
    async fn verified_program(
        &self,
        server: &ServerUrl,
        release: &VerifiedRelease,
    ) -> Result<PathBuf>;
}

/// Resolve a local base image, sharing any in-progress import for its release.
#[cfg_attr(test, unimock::unimock(api = BaseImagesMock))]
#[async_trait]
pub trait BaseImages: Send + Sync {
    /// Give the available local base image reference.
    async fn ensure(&self, server: &ServerUrl, release: &ComputerRelease) -> Result<String>;
}

/// Track imports that might install a Podman tag before image ID verification.
pub trait ImageJournal: Send + Sync {
    /// Whether this version has an incomplete import.
    fn incomplete(&self, version: &str) -> Result<bool>;
    /// Record intent before Podman can install the tag.
    fn start(&self, version: &str) -> Result<()>;
    /// Clear the record after the engine verified the loaded image.
    fn complete(&self, version: &str) -> Result<()>;
}
