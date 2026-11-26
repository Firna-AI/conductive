//! User-side unit helper. Its child pipes and output writer outlive the runner.

use std::os::unix::process::ExitStatusExt;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::services::process::ServiceProcessResult;
use tokio::io::AsyncReadExt;
use tokio::process::Command;
use tokio::signal::unix::{SignalKind, signal};

use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::{Logs, RunFiles, Runtime};
use crate::records::CompletedRun;

/// Unit-owned executable boundary, called only after systemd changes the user.
#[async_trait]
pub trait Execution: Send + Sync {
    /// Execute the saved argv and return the helper exit status.
    async fn run(&self, record: PathBuf) -> Result<u8>;
}

/// Native child execution and complete byte capture, without ambient env values.
pub struct NativeExecution {
    /// Private run and process-result files.
    pub files: Arc<dyn RunFiles>,
    /// Rotating logs owned by this helper, outside the runner control group.
    pub logs: Arc<dyn Logs>,
    /// End timestamps, independent of activity and agent turns.
    pub runtime: Arc<dyn Runtime>,
}

#[async_trait]
impl Execution for NativeExecution {
    async fn run(&self, path: PathBuf) -> Result<u8> {
        let mut terminate = signal(SignalKind::terminate()).internal()?;
        let record = self.files.launch_record(path).await?;
        let Some(program) = record.definition.command.first() else {
            return Err(Error::CommandRequired);
        };
        let started = Command::new(program)
            .args(&record.definition.command[1..])
            .current_dir(&record.definition.folder)
            .env_clear()
            .envs(&record.environment)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn();
        let mut child = match started {
            Ok(child) => child,
            Err(_) => {
                self.files
                    .finish(
                        &record.unit,
                        CompletedRun {
                            ended_at: self.runtime.now(),
                            result: ServiceProcessResult::StartFailed,
                        },
                    )
                    .await?;
                return Ok(1);
            }
        };
        let mut stdout = child
            .stdout
            .take()
            .ok_or_else(|| Error::internal_message("service stdout pipe missing"))?;
        let mut stderr = child
            .stderr
            .take()
            .ok_or_else(|| Error::internal_message("service stderr pipe missing"))?;
        let mut output = vec![0; 8192];
        let mut errors = vec![0; 8192];
        let (mut out_open, mut err_open, mut terminated) = (true, true, false);
        let mut status = None;
        while out_open || err_open || status.is_none() {
            tokio::select! {
                read = stdout.read(&mut output), if out_open => {
                    let count = read.internal()?;
                    out_open = count != 0;
                    if out_open { self.logs.append(&record.service_id, output[..count].to_vec()).await?; }
                }
                read = stderr.read(&mut errors), if err_open => {
                    let count = read.internal()?;
                    err_open = count != 0;
                    if err_open { self.logs.append(&record.service_id, errors[..count].to_vec()).await?; }
                }
                ended = child.wait(), if status.is_none() => { status = Some(ended.internal()?); }
                _ = terminate.recv(), if !terminated => {
                    terminated = true;
                }
            }
        }
        let status =
            status.ok_or_else(|| Error::internal_message("service child result missing"))?;
        let result = match status.signal() {
            Some(signal) => ServiceProcessResult::Signal { signal },
            None => ServiceProcessResult::Exit {
                code: status.code().unwrap_or(1),
            },
        };
        self.files
            .finish(
                &record.unit,
                CompletedRun {
                    ended_at: self.runtime.now(),
                    result,
                },
            )
            .await?;
        Ok(if status.success() { 0 } else { 1 })
    }
}
