//! Filesystem operations for the runner state file and its reserve.

use std::io;
use std::path::Path;

use async_trait::async_trait;
use rustix::fs::statvfs;
use tokio::fs::{self, DirBuilder, OpenOptions};
use tokio::io::AsyncWriteExt;
use tokio::task::spawn_blocking;

mod reserve;

/// State replacement and real space allocation on the same filesystem.
#[cfg_attr(test, unimock::unimock(api = StateFilesMock))]
#[async_trait]
pub(crate) trait StateFiles: Send + Sync {
    /// Replace the state file in one rename after the complete write.
    async fn replace(&self, path: &Path, bytes: &[u8]) -> io::Result<()>;
    /// Remove the reserve if the runner owns it.
    async fn remove_reserve(&self, path: &Path) -> io::Result<()>;
    /// Check whether the runner's reserve occupies its full size on disk.
    async fn reserve_ready(&self, path: &Path) -> io::Result<bool>;
    /// Get the space available to the runner in the state folder.
    async fn available_bytes(&self, folder: &Path) -> io::Result<u64>;
    /// Allocate real blocks for the reserve and preserve other files.
    async fn allocate_reserve(&self, path: &Path, bytes: u64) -> io::Result<()>;
}

/// Native operations for a local state folder.
pub(crate) struct LocalStateFiles;

#[async_trait]
impl StateFiles for LocalStateFiles {
    async fn replace(&self, path: &Path, bytes: &[u8]) -> io::Result<()> {
        if let Some(parent) = path.parent().filter(|p| !p.as_os_str().is_empty()) {
            let mut builder = DirBuilder::new();
            builder.recursive(true).mode(0o700);
            builder.create(parent).await?;
        }
        let mut temporary = path.as_os_str().to_os_string();
        temporary.push(".next");
        let mut file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .mode(0o600)
            .open(&temporary)
            .await?;
        file.write_all(bytes).await?;
        file.flush().await?;
        fs::rename(&temporary, path).await
    }

    async fn remove_reserve(&self, path: &Path) -> io::Result<()> {
        let path = path.to_owned();
        spawn_blocking(move || reserve::remove(&path)).await?
    }

    async fn reserve_ready(&self, path: &Path) -> io::Result<bool> {
        let path = path.to_owned();
        spawn_blocking(move || reserve::ready(&path)).await?
    }

    async fn available_bytes(&self, folder: &Path) -> io::Result<u64> {
        let stats = statvfs(folder)?;
        Ok(stats.f_bavail.saturating_mul(stats.f_frsize))
    }

    async fn allocate_reserve(&self, path: &Path, bytes: u64) -> io::Result<()> {
        let path = path.to_owned();
        spawn_blocking(move || reserve::allocate(&path, bytes)).await?
    }
}
