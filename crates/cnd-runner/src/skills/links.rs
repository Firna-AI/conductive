//! Confine all skill links before a complete checkout becomes visible to helpers.

use std::path::Path;

use tokio::fs;

use super::error::{ErrorResultExt, Result};

pub(super) async fn close_snapshot(folder: &Path) -> Result<()> {
    let root = fs::canonicalize(folder).await.internal()?;
    let mut pending = vec![root.clone()];
    let mut removed = false;
    while let Some(folder) = pending.pop() {
        let mut entries = fs::read_dir(folder).await.internal()?;
        while let Some(entry) = entries.next_entry().await.internal()? {
            let kind = entry.file_type().await.internal()?;
            if kind.is_symlink() {
                let target = fs::read_link(entry.path()).await.internal()?;
                let inside = !target.is_absolute()
                    && fs::canonicalize(entry.path())
                        .await
                        .is_ok_and(|target| target.starts_with(&root));
                if !inside {
                    fs::remove_file(entry.path()).await.internal()?;
                    removed = true;
                }
            } else if kind.is_dir() {
                pending.push(entry.path());
            }
        }
    }
    if removed {
        tracing::warn!(
            "The skills copy contained escaping or dangling links. Those links were removed."
        );
    }
    Ok(())
}
