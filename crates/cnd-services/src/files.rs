//! Private runtime files and an exclusive manager lock under /run.

use std::fs::{File, OpenOptions};
use std::io::ErrorKind;
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::path::{Path, PathBuf};

use async_trait::async_trait;
use cnd_runner_interface::json::decoder;
use serde::Serialize;
use serde::de::DeserializeOwned;
use tokio::sync::Mutex;

use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::{RunFiles, Store};
use crate::records::{CompletedRun, LaunchRecord, Registry};

/// Runtime directory used by the runner, local tools, and service helpers.
pub const SERVICES_DIRECTORY: &str = "/run/conductive/services";

/// A store takes its process lock only when the manager loads its registry.
pub struct RuntimeFiles {
    /// Private root, normally SERVICES_DIRECTORY.
    pub root: PathBuf,
    lock: Mutex<Option<File>>,
}

impl RuntimeFiles {
    /// Select runtime paths without touching the filesystem.
    pub fn new(root: PathBuf) -> Self {
        Self {
            root,
            lock: Mutex::new(None),
        }
    }
}

#[async_trait]
impl RunFiles for RuntimeFiles {
    async fn launch_record(&self, path: PathBuf) -> Result<LaunchRecord> {
        read(&path)
            .await?
            .ok_or_else(|| Error::internal_message("service launch record missing"))
    }

    /// Save a result from the unit-owned user-side helper.
    async fn finish(&self, unit: &str, result: CompletedRun) -> Result<()> {
        let folder = self.root.join("results");
        private_directory(&folder).await?;
        write(&folder.join(format!("{unit}.json")), &result).await
    }
}

#[async_trait]
impl Store for RuntimeFiles {
    async fn load(&self) -> Result<Option<Registry>> {
        private_directory(&self.root).await?;
        let mut lock = self.lock.lock().await;
        if lock.is_none() {
            let file = OpenOptions::new()
                .create(true)
                .read(true)
                .write(true)
                .truncate(false)
                .mode(0o600)
                .open(self.root.join("manager.lock"))
                .internal()?;
            file.try_lock().internal()?;
            *lock = Some(file);
        }
        read(&self.root.join("registry.json")).await
    }

    async fn save(&self, state: Registry) -> Result<()> {
        write(&self.root.join("registry.json"), &state).await
    }

    async fn prepare(&self, record: LaunchRecord) -> Result<PathBuf> {
        let folder = self.root.join("runs");
        private_directory(&folder).await?;
        let path = folder.join(format!("{}.json", record.unit));
        write(&path, &record).await?;
        Ok(path)
    }

    async fn completed(&self, unit: &str) -> Result<Option<CompletedRun>> {
        read(&self.root.join("results").join(format!("{unit}.json"))).await
    }
}

pub(crate) async fn private_directory(path: &Path) -> Result<()> {
    tokio::fs::create_dir_all(path).await.internal()?;
    tokio::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700))
        .await
        .internal()
}

async fn read<T: DeserializeOwned>(path: &Path) -> Result<Option<T>> {
    match tokio::fs::read(path).await {
        Ok(bytes) => Ok(Some(decoder::decode(&bytes).internal()?)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        result => {
            result.internal()?;
            Ok(None)
        }
    }
}

async fn write<T: Serialize>(path: &Path, value: &T) -> Result<()> {
    let temporary = path.with_extension("next");
    let file = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .mode(0o600)
        .open(&temporary)
        .internal()?;
    let mut file = tokio::fs::File::from_std(file);
    tokio::io::AsyncWriteExt::write_all(&mut file, &serde_json::to_vec(value).internal()?)
        .await
        .internal()?;
    tokio::io::AsyncWriteExt::flush(&mut file)
        .await
        .internal()?;
    tokio::fs::rename(temporary, path).await.internal()
}
