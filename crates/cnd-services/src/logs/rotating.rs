//! Retention policy over locked log-file effects.

use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::services::logs::SERVICE_LOG_MAX_BYTES;

use crate::error::{ErrorResultExt, Result};
use crate::ports::Logs;

/// A locked service log. Its lifetime serializes readers with writer rotation.
#[cfg_attr(test, unimock::unimock(api = LogTransactionMock))]
pub trait LogTransaction: Send + Sync {
    /// Length of the current file, excluding its previous rotation.
    fn current_len(&self) -> Result<u64>;
    /// Replace the previous rotation with the current file.
    fn rotate(&self) -> Result<()>;
    /// Append literal bytes to the current file.
    fn append(&self, bytes: &[u8]) -> Result<()>;
    /// Join retained bytes in order before any UTF-8 decoding or filtering.
    fn read(&self) -> Result<(Vec<u8>, bool)>;
}

/// Filesystem and cross-process locking effects for one service log.
#[cfg_attr(test, unimock::unimock(api = LogFilesMock))]
pub trait LogFiles: Send + Sync {
    /// Open a locked log transaction for this opaque service identity.
    fn open(&self, service: &str) -> Result<Arc<dyn LogTransaction>>;
}

/// Two rotating files together never exceed the approved retained byte budget.
pub struct RotatingLogs {
    /// Private runtime file effects.
    pub files: Arc<dyn LogFiles>,
}

#[async_trait]
impl Logs for RotatingLogs {
    async fn append(&self, service: &str, bytes: Vec<u8>) -> Result<()> {
        let files = self.files.clone();
        let service = service.to_owned();
        tokio::task::spawn_blocking(move || {
            let log = files.open(&service)?;
            let mut remaining = bytes.as_slice();
            let file_budget = SERVICE_LOG_MAX_BYTES / 2;
            while !remaining.is_empty() {
                let length = log.current_len()?;
                if length >= file_budget {
                    log.rotate()?;
                    continue;
                }
                let count = remaining.len().min((file_budget - length) as usize);
                log.append(&remaining[..count])?;
                remaining = &remaining[count..];
            }
            Ok(())
        })
        .await
        .internal()?
    }

    async fn read(&self, service: &str) -> Result<(Vec<u8>, bool)> {
        let files = self.files.clone();
        let service = service.to_owned();
        tokio::task::spawn_blocking(move || files.open(&service)?.read())
            .await
            .internal()?
    }
}
