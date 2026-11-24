//! Complete-JSON budgets, including bounded command status output.

use std::io::{self, Write};

use cnd_runner_interface::host::limits::{
    HOST_COMMAND_REPLY_MAX_BYTES, HOST_FILE_READ_MAX_BYTES, HOST_REPLY_MAX_BYTES,
};
use cnd_runner_interface::host::messages::HostToWorker;
use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::{HostErrorCode, HostResult};

use crate::error::{ErrorResultExt, Result};

/// Complete JSON budget for an operation, before any response leaves the host.
pub fn budget(operation: &HostOperation) -> usize {
    match operation {
        HostOperation::CommandRun { .. } | HostOperation::CommandStatus { .. } => {
            HOST_COMMAND_REPLY_MAX_BYTES
        }
        HostOperation::FileRead { max_bytes, .. } => {
            let raw = (*max_bytes).min(HOST_FILE_READ_MAX_BYTES as u64) as usize;
            4 * raw.div_ceil(3) + HOST_REPLY_MAX_BYTES
        }
        _ => HOST_REPLY_MAX_BYTES,
    }
}

/// Bound the actual compact reply, including its request envelope.
pub fn bounded(request_id: u32, mut result: HostResult, maximum: usize) -> Result<HostToWorker> {
    loop {
        let message = HostToWorker::Reply {
            request_id,
            result: result.clone(),
        };
        let maximum = if matches!(result, HostResult::Error { .. }) {
            HOST_REPLY_MAX_BYTES
        } else {
            maximum
        };
        let mut count = Counter(0);
        serde_json::to_writer(&mut count, &message).internal()?;
        if count.0 <= maximum {
            return Ok(message);
        }
        match &mut result {
            HostResult::CommandStatus {
                stdout,
                stderr,
                stdout_next_offset,
                stderr_next_offset,
                more,
                ..
            } if !stdout.is_empty() || !stderr.is_empty() => {
                if stdout.len() >= stderr.len() {
                    *stdout_next_offset = stdout_next_offset.saturating_sub(shorten(stdout) as u64);
                } else {
                    *stderr_next_offset = stderr_next_offset.saturating_sub(shorten(stderr) as u64);
                }
                *more = true;
            }
            HostResult::CommandResult { .. } => {
                result = HostResult::Error {
                    code: HostErrorCode::OutputTooLarge,
                }
            }
            _ => {
                result = HostResult::Error {
                    code: HostErrorCode::Internal,
                }
            }
        }
    }
}

fn shorten(text: &mut String) -> usize {
    let previous = text.len();
    let mut end = previous / 2;
    while !text.is_char_boundary(end) {
        end -= 1;
    }
    text.truncate(end);
    previous - end
}

struct Counter(usize);

impl Write for Counter {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.0 = self.0.saturating_add(bytes.len());
        Ok(bytes.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

#[cfg(test)]
#[path = "_tests_/replies_tests.rs"]
mod tests;
