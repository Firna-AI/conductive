//! Keep the runner process ID while starting the newly installed release.

use std::convert::Infallible;
use std::os::unix::process::CommandExt;
use std::path::Path;
use std::process::{self, Stdio};

use async_trait::async_trait;
use tokio::process::Command;

use crate::update::error::{Error, ErrorResultExt, Result};

use super::ports::SwapProcesses;

/// Execute activation without a terminal and replace the current unprivileged process.
pub struct SystemSwap;

#[async_trait]
impl SwapProcesses for SystemSwap {
    async fn apply(&self, executable: &Path) -> Result<()> {
        let status = Command::new("sudo")
            .args(["-n", "--"])
            .arg(executable)
            .args(["update", "apply"])
            .stdin(Stdio::null())
            .status()
            .await
            .internal()?;
        if !status.success() {
            return Err(Error::StartFailed);
        }
        Ok(())
    }

    fn exec(&self, start_script: &Path) -> Result<Infallible> {
        Err(process::Command::new(start_script)
            .stdin(Stdio::null())
            .exec())
        .internal()
    }
}
