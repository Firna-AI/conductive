//! Filesystem operations for the runner state file and its reserve.

use std::fs::File;
use std::io::{self, ErrorKind};
use std::os::unix::fs::{MetadataExt, OpenOptionsExt};
use std::path::Path;

use async_trait::async_trait;
use rustix::fs::{FallocateFlags, fallocate, statvfs};
use tokio::fs::{self, DirBuilder, OpenOptions};
use tokio::io::AsyncWriteExt;
use tokio::task::spawn_blocking;

use crate::disk::RESERVE_BYTES;

/// State replacement and real space allocation on the same filesystem.
#[cfg_attr(test, unimock::unimock(api = StateFilesMock))]
#[async_trait]
pub(crate) trait StateFiles: Send + Sync {
    /// Replace the state file in one rename after the complete write.
    async fn replace(&self, path: &Path, bytes: &[u8]) -> io::Result<()>;
    /// Remove the reserve if it exists.
    async fn remove_reserve(&self, path: &Path) -> io::Result<()>;
    /// Check whether the reserve occupies its full size on disk.
    async fn reserve_ready(&self, path: &Path) -> io::Result<bool>;
    /// Get the space available to the runner in the state folder.
    async fn available_bytes(&self, folder: &Path) -> io::Result<u64>;
    /// Allocate real blocks for the reserve and clean up if allocation fails.
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
        ignore_missing(fs::remove_file(path).await)
    }

    async fn reserve_ready(&self, path: &Path) -> io::Result<bool> {
        match fs::symlink_metadata(path).await {
            Ok(metadata) => Ok(metadata.is_file()
                && metadata.len() == RESERVE_BYTES
                && metadata.blocks() >= RESERVE_BYTES / 512),
            Err(error) if error.kind() == ErrorKind::NotFound => Ok(false),
            Err(error) => Err(error),
        }
    }

    async fn available_bytes(&self, folder: &Path) -> io::Result<u64> {
        let stats = statvfs(folder)?;
        Ok(stats.f_bavail.saturating_mul(stats.f_frsize))
    }

    async fn allocate_reserve(&self, path: &Path, bytes: u64) -> io::Result<()> {
        let path = path.to_owned();
        spawn_blocking(move || {
            ignore_missing(std::fs::remove_file(&path))?;
            let file = File::options()
                .write(true)
                .create_new(true)
                .mode(0o600)
                .open(&path)?;
            if let Err(error) = fallocate(&file, FallocateFlags::empty(), 0, bytes) {
                let _ = std::fs::remove_file(&path);
                return Err(error.into());
            }
            Ok(())
        })
        .await?
    }
}

fn ignore_missing(result: io::Result<()>) -> io::Result<()> {
    match result {
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        result => result,
    }
}
