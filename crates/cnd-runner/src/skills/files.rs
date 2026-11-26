//! Filesystem operations within the runner-owned skills store.

use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use tokio::fs;

use super::error::{ErrorResultExt, Result};

pub(super) fn text(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

pub(super) fn commit_id(value: &str) -> bool {
    matches!(value.len(), 40 | 64)
        && value
            .bytes()
            .all(|c| c.is_ascii_digit() || (b'a'..=b'f').contains(&c))
}

pub(super) async fn exists(path: &Path) -> Result<bool> {
    match fs::metadata(path).await {
        Ok(metadata) => Ok(metadata.is_dir()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(false),
        Err(error) => Err(error).internal(),
    }
}

pub(super) async fn read_link(path: &Path) -> Result<Option<PathBuf>> {
    match fs::read_link(path).await {
        Ok(target) => Ok(Some(target)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error).internal(),
    }
}

pub(super) async fn remove(path: &Path) -> Result<()> {
    match fs::symlink_metadata(path).await {
        Ok(metadata) if metadata.is_dir() => fs::remove_dir_all(path).await.internal(),
        Ok(_) => fs::remove_file(path).await.internal(),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error).internal(),
    }
}

pub(super) async fn recover_locks(store: &Path) -> Result<()> {
    if !exists(store).await? {
        return Ok(());
    }
    let mut pending = vec![store.to_owned()];
    while let Some(folder) = pending.pop() {
        let mut entries = fs::read_dir(folder).await.internal()?;
        while let Some(entry) = entries.next_entry().await.internal()? {
            if entry.file_name().to_string_lossy().ends_with(".lock") {
                remove(&entry.path()).await?;
            } else if entry.file_type().await.internal()?.is_dir() {
                pending.push(entry.path());
            }
        }
    }
    Ok(())
}
