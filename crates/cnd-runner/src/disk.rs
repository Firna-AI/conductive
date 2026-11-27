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
    reserve: Option<PathBuf>,
    files: Box<dyn StateFiles>,
    writes: Mutex<()>,
}

impl AtomicDisk {
    /// Configure a state path without performing IO.
    pub fn new(path: PathBuf) -> Self {
        Self::with_files(path, Box::new(LocalStateFiles))
    }

    fn with_files(path: PathBuf, files: Box<dyn StateFiles>) -> Self {
        let reserve = path.with_file_name("disk-reserve");
        let reserve = (reserve != path).then_some(reserve);
        Self {
            path,
            reserve,
            files,
            writes: Mutex::new(()),
        }
    }

    async fn replenish_reserve(&self, reserve: &Path) -> io::Result<()> {
        if self.files.reserve_ready(reserve).await? {
            return Ok(());
        }
        let folder = reserve
            .parent()
            .filter(|folder| !folder.as_os_str().is_empty())
            .unwrap_or(Path::new("."));
        if self.files.available_bytes(folder).await? >= REBUILD_MIN_BYTES {
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
        let _guard = self.writes.lock().await;
        match self.files.replace(&self.path, bytes).await {
            Ok(()) => {
                if let Some(reserve) = &self.reserve {
                    let _ = self.replenish_reserve(reserve).await;
                }
                Ok(())
            }
            Err(error) if error.kind() == ErrorKind::StorageFull => {
                if let Some(reserve) = &self.reserve {
                    let _ = self.files.remove_reserve(reserve).await;
                }
                self.files.replace(&self.path, bytes).await.internal()
            }
            Err(error) => Err(error).internal(),
        }
    }
}

#[cfg(test)]
#[path = "_tests_/disk_reserve_tests.rs"]
mod disk_reserve_tests;
