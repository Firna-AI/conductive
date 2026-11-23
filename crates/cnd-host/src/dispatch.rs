//! Validate fixed operations before the native command and file boundaries.

use std::path::Path;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::host::limits::HOST_FILE_READ_MAX_BYTES;
use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::{HostErrorCode, HostResult};

use crate::error::Result;
use crate::ports::{Commands, Files, Operations};

/// Largest non-negative integer represented exactly by JavaScript.
pub const SAFE_INTEGER: u64 = 9_007_199_254_740_991;

/// Shared native effects. Detached commands survive a new session.
pub struct Dispatcher {
    /// Clean command execution and runtime records.
    pub commands: Arc<dyn Commands>,
    /// File access as the sandbox user.
    pub files: Arc<dyn Files>,
}

#[async_trait]
impl Operations for Dispatcher {
    async fn execute(&self, operation: HostOperation) -> Result<HostResult> {
        match operation {
            HostOperation::CommandRun {
                command,
                timeout_seconds,
            } if (1..=600).contains(&timeout_seconds) && !command.contains('\0') => {
                self.commands.run(&command, timeout_seconds).await
            }
            HostOperation::CommandStart { command } if !command.contains('\0') => {
                self.commands.start(&command).await
            }
            HostOperation::CommandStatus {
                process_id,
                stdout_offset,
                stderr_offset,
            } if (1..=SAFE_INTEGER).contains(&process_id)
                && stdout_offset <= SAFE_INTEGER
                && stderr_offset <= SAFE_INTEGER =>
            {
                self.commands
                    .status(process_id, stdout_offset, stderr_offset)
                    .await
            }
            HostOperation::FileInfo { path } if valid_path(&path) => self.files.info(&path).await,
            HostOperation::FileRead { path, max_bytes }
                if valid_path(&path) && max_bytes <= HOST_FILE_READ_MAX_BYTES as u64 =>
            {
                self.files.read(&path, max_bytes).await
            }
            _ => Ok(HostResult::Error {
                code: HostErrorCode::InvalidRequest,
            }),
        }
    }
}

fn valid_path(path: &str) -> bool {
    Path::new(path).is_absolute() && !path.contains('\0')
}

#[cfg(test)]
#[path = "_tests_/dispatch_tests.rs"]
mod tests;
