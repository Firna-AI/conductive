//! Fixed system-manager commands. Repository text stays in user-only run files.

use std::path::PathBuf;
use std::process::Stdio;

use async_trait::async_trait;
use cnd_runner_interface::services::process::ServiceProcessResult;
use tokio::process::Command;

use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::Units;
use crate::records::UnitStatus;

/// Native adapter with a current executable path, never a saved release pin.
pub struct SystemUnits {
    /// /opt/conductive/current/conductive, or the current development executable.
    pub executable: PathBuf,
}

#[async_trait]
impl Units for SystemUnits {
    async fn launch(&self, unit: &str, record: PathBuf) -> Result<()> {
        let executable = tokio::fs::canonicalize(&self.executable).await.internal()?;
        let status = Command::new("sudo")
            .args([
                "-n",
                "--",
                "systemd-run",
                "--quiet",
                "--service-type=exec",
                "--expand-environment=no",
                "--unit",
            ])
            .arg(unit)
            .args([
                "--property=User=user",
                "--property=Group=user",
                "--property=WorkingDirectory=/",
                "--property=OOMPolicy=stop",
                "--property=KillMode=control-group",
                "--property=Restart=no",
                "--property=StandardInput=null",
                "--property=StandardOutput=null",
                "--property=StandardError=null",
                "--",
            ])
            .arg(executable.to_string_lossy().replace('%', "%%"))
            .arg("service-exec")
            .arg(record.to_string_lossy().replace('%', "%%"))
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .internal()?;
        if !status.success() {
            return Err(Error::Unit);
        }
        Ok(())
    }

    async fn stop(&self, unit: &str) -> Result<()> {
        let status = Command::new("sudo")
            .args(["-n", "--", "systemctl", "stop", "--", unit])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .await
            .internal()?;
        if !status.success() {
            return Err(Error::Unit);
        }
        Ok(())
    }

    async fn inspect(&self, unit: &str) -> Result<UnitStatus> {
        let output = Command::new("systemctl")
            .args(["show", "--no-pager", "--property=LoadState,ActiveState,SubState,ControlGroup,Result,ExecMainCode,ExecMainStatus", "--", unit])
            .stdin(Stdio::null()).stderr(Stdio::null()).output().await.internal()?;
        let text = String::from_utf8_lossy(&output.stdout);
        let property = |name: &str| text.lines().find_map(|line| line.strip_prefix(name));
        if property("LoadState=") == Some("not-found") {
            return Ok(UnitStatus {
                running: false,
                cgroup: None,
                result: None,
            });
        }
        if !output.status.success() {
            return Err(Error::Unit);
        }
        let running = property("ActiveState=")
            .is_some_and(|state| matches!(state, "active" | "activating" | "deactivating"))
            && property("SubState=") != Some("exited");
        let result = if property("Result=") == Some("oom-kill") {
            Some(ServiceProcessResult::OutOfMemory)
        } else if running {
            None
        } else {
            match (
                property("ExecMainCode="),
                property("ExecMainStatus=").and_then(|value| value.parse::<i32>().ok()),
            ) {
                (Some("1"), Some(code)) => Some(ServiceProcessResult::Exit { code }),
                (Some("2" | "3"), Some(signal)) => Some(ServiceProcessResult::Signal { signal }),
                _ => Some(ServiceProcessResult::StartFailed),
            }
        };
        Ok(UnitStatus {
            running,
            result,
            cgroup: property("ControlGroup=")
                .filter(|value| !value.is_empty())
                .map(String::from),
        })
    }
}
