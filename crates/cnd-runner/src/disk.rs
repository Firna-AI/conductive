//! Atomic state-file replacement with private Unix permissions.

use std::io::{self, ErrorKind};
use std::path::{Path, PathBuf};

use async_trait::async_trait;
use tokio::fs;
use tokio::sync::Mutex;

use crate::disk_files::{LocalStateFiles, StateFiles};
use crate::error::{ErrorResultExt, Result};

/// Real bytes reserved on the filesystem that holds the state file.
pub(crate) const RESERVE_BYTES: u64 = 256 * 1024 * 1024;
const REBUILD_MIN_BYTES: u64 = 1024 * 1024 * 1024;

/// Read and atomically replace the runner's complete state.
#[cfg_attr(test, unimock::unimock(api = DiskMock))]
#[async_trait]
pub trait Disk: Send + Sync {
    /// Missing state is a first start. Other read failures stop startup.
    async fn read(&self) -> Result<Option<Vec<u8>>>;
    /// Success means that later reads see this complete state.
    async fn write(&self, bytes: &[u8]) -> Result<()>;
}

/// The Node-compatible state file and its adjacent `.next` file.
pub struct AtomicDisk {
    path: PathBuf,
    reserve: Mutex<Option<PathBuf>>,
    files: Box<dyn StateFiles>,
}

impl AtomicDisk {
    /// Configure a state path without performing IO.
    pub fn new(path: PathBuf) -> Self {
        Self::with_files(path, Box::new(LocalStateFiles))
    }

    fn with_files(path: PathBuf, files: Box<dyn StateFiles>) -> Self {
        let reserve = (path.is_absolute() && path.file_name().is_some())
            .then(|| path.with_added_extension("reserve"));
        Self {
            path,
            reserve: Mutex::new(reserve),
            files,
        }
    }

    async fn replenish_reserve(&self, reserve: &Path) -> io::Result<()> {
        if self.files.reserve_ready(reserve).await? {
            return Ok(());
        }
        if let Some(folder) = reserve.parent()
            && self.files.available_bytes(folder).await? >= REBUILD_MIN_BYTES
        {
            self.files.allocate_reserve(reserve, RESERVE_BYTES).await?;
        }
        Ok(())
    }
}

#[async_trait]
impl Disk for AtomicDisk {
    async fn read(&self) -> Result<Option<Vec<u8>>> {
        match fs::read(&self.path).await {
            Ok(bytes) => Ok(Some(bytes)),
            Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
            Err(error) => Err(error).internal(),
        }
    }

    async fn write(&self, bytes: &[u8]) -> Result<()> {
        let mut reserve = self.reserve.lock().await;
        match self.files.replace(&self.path, bytes).await {
            Ok(()) => {
                if let Some(path) = reserve.as_deref() {
                    let result = self.replenish_reserve(path).await;
                    disable_reserve_on_collision(&mut reserve, result);
                }
                Ok(())
            }
            Err(error) if error.kind() == ErrorKind::StorageFull => {
                if let Some(path) = reserve.as_deref() {
                    let result = self.files.remove_reserve(path).await;
                    disable_reserve_on_collision(&mut reserve, result);
                }
                self.files.replace(&self.path, bytes).await.internal()
            }
            Err(error) => Err(error).internal(),
        }
    }
}

fn disable_reserve_on_collision(reserve: &mut Option<PathBuf>, result: io::Result<()>) {
    if let Err(error) = result
        && error.kind() == ErrorKind::AlreadyExists
        && let Some(path) = reserve.take()
    {
        tracing::warn!(path = %path.display(), "Runner state reserve path is already in use");
    }
}

#[cfg(test)]
#[path = "_tests_/disk_reserve_tests.rs"]
mod disk_reserve_tests;
