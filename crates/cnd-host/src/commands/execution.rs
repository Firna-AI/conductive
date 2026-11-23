//! Wait only for Bash, then return its bounded file output and remove the files.

use std::time::Duration;

use cnd_runner_interface::host::results::HostResult;

use crate::error::{ErrorResultExt, Result};

use super::capture::Capture;
use super::native::NativeCommands;
use super::process::{self, Group};

impl NativeCommands {
    pub(super) async fn run_command(&self, text: &str, timeout_seconds: u32) -> Result<HostResult> {
        let capture = Capture::new(&self.root).await?;
        let stdout = capture.output("stdout").await?;
        let stderr = capture.output("stderr").await?;
        let mut child = process::shell(&self.home, text)
            .stdout(stdout)
            .stderr(stderr)
            .spawn()
            .internal()?;
        let mut group = Group::child(&child)?;
        let completed = tokio::time::timeout(
            Duration::from_secs(u64::from(timeout_seconds)),
            child.wait(),
        )
        .await;
        let (exit_code, timed_out) = match completed {
            Ok(status) => (Some(process::exit_code(status.internal()?)), false),
            Err(_) => {
                group.kill();
                let _ = child.wait().await.internal()?;
                (None, true)
            }
        };
        group.disarm();
        capture.result(exit_code, timed_out).await
    }
}
