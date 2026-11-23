//! Private detached-command exit records with atomic publication.

use std::future::Future;
use std::io::ErrorKind;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::pin::Pin;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tokio::fs::{self, OpenOptions};
use tokio::io::AsyncWriteExt;

use crate::error::{ErrorResultExt, Result};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
/// Persisted final result of one detached command.
pub(super) struct Exit {
    pub(super) exit_code: i32,
    pub(super) timed_out: Option<bool>,
}

/// Persisted exit observation, replaceable at a controlled test barrier.
pub(super) type ExitRead<'a> = Pin<Box<dyn Future<Output = Result<Option<Exit>>> + Send + 'a>>;

#[cfg_attr(test, unimock::unimock(api = [ReadExit, WriteExit]))]
#[async_trait]
pub(super) trait ExitRecords: Send + Sync {
    fn read(&self, process_id: u64) -> ExitRead<'_>;
    async fn write(&self, process_id: u64, exit: Exit) -> Result<()>;
}

pub(super) struct NativeExitRecords {
    pub(super) root: PathBuf,
}

#[async_trait]
impl ExitRecords for NativeExitRecords {
    fn read(&self, process_id: u64) -> ExitRead<'_> {
        Box::pin(async move {
            match fs::read(self.root.join(process_id.to_string()).join("exit.json")).await {
                Ok(bytes) => Ok(Some(serde_json::from_slice(&bytes).internal()?)),
                Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
                other => {
                    other.internal()?;
                    Ok(None)
                }
            }
        })
    }

    async fn write(&self, process_id: u64, exit: Exit) -> Result<()> {
        finish(&self.root.join(process_id.to_string()), exit).await
    }
}

pub(super) async fn private_folder(path: &Path) -> Result<()> {
    fs::create_dir_all(path).await.internal()?;
    fs::set_permissions(path, std::fs::Permissions::from_mode(0o700))
        .await
        .internal()
}

pub(super) async fn finish(folder: &Path, exit: Exit) -> Result<()> {
    let temporary = folder.join("exit.json.tmp");
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .mode(0o600)
        .open(&temporary)
        .await
        .internal()?;
    file.write_all(&serde_json::to_vec(&exit).internal()?)
        .await
        .internal()?;
    file.flush().await.internal()?;
    fs::rename(temporary, folder.join("exit.json"))
        .await
        .internal()
}
