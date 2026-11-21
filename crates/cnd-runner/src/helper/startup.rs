//! Startup credential cleanup and release confirmation.

use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::process::Stdio;

use async_trait::async_trait;
use tokio::fs;
use tokio::process::Command;

use crate::error::{Error, ErrorResultExt, Result};

use super::boundary::Startup;

/// Host operations invoked once by the turn handler, never on reconnect.
pub struct RunnerStartup {
    /// Agent home whose stale credentials are removed.
    pub home: PathBuf,
    /// Pinned executable used to confirm the release.
    pub executable: PathBuf,
}

async fn directory(path: &Path) -> Result<Option<fs::ReadDir>> {
    match fs::read_dir(path).await {
        Ok(entries) => Ok(Some(entries)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error).internal(),
    }
}

async fn remove(path: PathBuf) -> Result<()> {
    match fs::symlink_metadata(&path).await {
        Ok(metadata) => {
            if metadata.is_dir() {
                fs::remove_dir_all(path).await.internal()
            } else {
                fs::remove_file(path).await.internal()
            }
        }
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error).internal(),
    }
}

#[async_trait]
impl Startup for RunnerStartup {
    async fn prepare(&self) -> Result<()> {
        if let Some(mut entries) = directory(&self.home.join(".conductive/anthropic")).await? {
            while let Some(entry) = entries.next_entry().await.internal()? {
                remove(entry.path()).await?;
            }
        }
        if let Some(mut sessions) =
            directory(&self.home.join(".conductive/codex/session-homes")).await?
        {
            while let Some(session) = sessions.next_entry().await.internal()? {
                if !session.file_type().await.internal()?.is_dir() {
                    continue;
                }
                if let Some(mut entries) = directory(&session.path()).await? {
                    while let Some(entry) = entries.next_entry().await.internal()? {
                        let name = entry.file_name();
                        if name == "auth.json" || name.to_string_lossy().starts_with(".auth-") {
                            remove(entry.path()).await?;
                        }
                    }
                }
            }
        }
        Ok(())
    }

    async fn welcomed(&self) -> Result<()> {
        let status = Command::new("/usr/bin/sudo")
            .arg("-n")
            .arg("--")
            .arg(&self.executable)
            .args(["update", "started"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .internal()?;
        if !status.success() {
            return Err(Error::ReleaseConfirmation);
        }
        Ok(())
    }
}
