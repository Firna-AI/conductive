//! Atomic state-file replacement with private Unix permissions.

use std::io::ErrorKind;
use std::path::PathBuf;

use async_trait::async_trait;
use tokio::fs;
use tokio::sync::Mutex;

use crate::disk_files::{LocalStateFiles, StateFiles};
use crate::error::{ErrorResultExt, Result};

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
    reserve_failure_logged: Mutex<bool>,
    files: Box<dyn StateFiles>,
}

impl AtomicDisk {
    /// Configure a state path without performing IO.
    pub fn new(path: PathBuf) -> Self {
        Self::with_files(path, Box::new(LocalStateFiles))
    }

    fn with_files(path: PathBuf, files: Box<dyn StateFiles>) -> Self {
        Self {
            path,
            reserve_failure_logged: Mutex::new(false),
            files,
        }
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
        let mut reserve_failure_logged = self.reserve_failure_logged.lock().await;
        match self.files.replace(&self.path, bytes).await {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == ErrorKind::StorageFull => {
                if let Err(error) = self.files.free_reserve().await
                    && !*reserve_failure_logged
                {
                    tracing::warn!(%error, "Could not free the runner disk reserve");
                    *reserve_failure_logged = true;
                }
                self.files.replace(&self.path, bytes).await.internal()
            }
            Err(error) => Err(error).internal(),
        }
    }
}

#[cfg(test)]
#[path = "_tests_/disk_pressure_tests.rs"]
mod disk_pressure_tests;
