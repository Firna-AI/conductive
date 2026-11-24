//! Private temporary command output with bounded snapshots independent of pipe EOF.

use std::path::Path;
use std::process::Stdio;

use cnd_runner_interface::host::limits::HOST_COMMAND_REPLY_MAX_BYTES;
use cnd_runner_interface::host::results::{HostErrorCode, HostResult};
use tempfile::TempDir;
use tokio::fs::{File, OpenOptions};
use tokio::io::AsyncReadExt;

use crate::error::{ErrorResultExt, Result};

use super::records;

pub(super) struct Capture {
    folder: TempDir,
}

impl Capture {
    pub(super) async fn new(root: &Path) -> Result<Self> {
        records::private_folder(root).await?;
        let folder = tempfile::Builder::new()
            .prefix("run-")
            .tempdir_in(root)
            .internal()?;
        Ok(Self { folder })
    }

    pub(super) async fn output(&self, name: &str) -> Result<Stdio> {
        let file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(self.folder.path().join(name))
            .await
            .internal()?
            .into_std()
            .await;
        Ok(Stdio::from(file))
    }

    pub(super) async fn result(
        &self,
        exit_code: Option<i32>,
        timed_out: bool,
    ) -> Result<HostResult> {
        let stdout = File::open(self.folder.path().join("stdout"))
            .await
            .internal()?;
        let stderr = File::open(self.folder.path().join("stderr"))
            .await
            .internal()?;
        let (out, err) = tokio::try_join!(stdout.metadata(), stderr.metadata()).internal()?;
        if out.len() > HOST_COMMAND_REPLY_MAX_BYTES as u64
            || err.len() > HOST_COMMAND_REPLY_MAX_BYTES as u64
        {
            return Ok(HostResult::Error {
                code: HostErrorCode::OutputTooLarge,
            });
        }
        let mut output = Vec::new();
        let mut errors = Vec::new();
        let mut stdout = stdout.take(out.len());
        let mut stderr = stderr.take(err.len());
        tokio::try_join!(
            stdout.read_to_end(&mut output),
            stderr.read_to_end(&mut errors),
        )
        .internal()?;
        Ok(HostResult::CommandResult {
            exit_code,
            timed_out,
            stdout: String::from_utf8_lossy(&output).into_owned(),
            stderr: String::from_utf8_lossy(&errors).into_owned(),
        })
    }
}
