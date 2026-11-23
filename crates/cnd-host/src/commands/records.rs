//! Private detached-command exit records with atomic publication.

use std::os::unix::fs::PermissionsExt;
use std::path::Path;

use serde::{Deserialize, Serialize};
use tokio::fs::{self, OpenOptions};
use tokio::io::AsyncWriteExt;

use crate::error::{ErrorResultExt, Result};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct Exit {
    pub(super) exit_code: i32,
    pub(super) timed_out: Option<bool>,
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
