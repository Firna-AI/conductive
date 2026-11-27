//! Save runner state and call the root command that frees its reserve.

use std::env;
use std::io;
use std::path::Path;
use std::process::Stdio;

use async_trait::async_trait;
use tokio::fs::{self, DirBuilder, OpenOptions};
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

/// State replacement and recovery from a full filesystem.
#[cfg_attr(test, unimock::unimock(api = StateFilesMock))]
#[async_trait]
pub(crate) trait StateFiles: Send + Sync {
    /// Replace the state file in one rename after the complete write.
    async fn replace(&self, path: &Path, bytes: &[u8]) -> io::Result<()>;
    /// Free the space set aside for state saves.
    async fn free_reserve(&self) -> io::Result<()>;
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

    async fn free_reserve(&self) -> io::Result<()> {
        let status = Command::new("/usr/bin/sudo")
            .args(["-n", "--"])
            .arg(env::current_exe()?)
            .args(["disk", "free-reserve"])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await?;
        if status.success() {
            Ok(())
        } else {
            Err(io::Error::other(format!(
                "disk free-reserve exited with {status}"
            )))
        }
    }
}
