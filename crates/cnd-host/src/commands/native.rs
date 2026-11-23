//! Native command boundary shared by every reconnect of the host program.

use std::collections::BTreeSet;
use std::path::PathBuf;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::host::results::HostResult;
use tokio::sync::Mutex;

use crate::error::Result;
use crate::ports::Commands;

/// Native commands and process identities for this host program start.
pub struct NativeCommands {
    pub(super) root: PathBuf,
    pub(super) home: PathBuf,
    pub(super) active: Arc<Mutex<BTreeSet<u64>>>,
}

impl NativeCommands {
    /// Select runtime record and home folders, without reading either folder.
    pub fn new(root: PathBuf, home: PathBuf) -> Self {
        Self {
            root,
            home,
            active: Arc::new(Mutex::new(BTreeSet::new())),
        }
    }
}

#[async_trait]
impl Commands for NativeCommands {
    async fn run(&self, command: &str, timeout_seconds: u32) -> Result<HostResult> {
        self.run_command(command, timeout_seconds).await
    }

    async fn start(&self, command: &str) -> Result<HostResult> {
        self.start_command(command).await
    }

    async fn status(
        &self,
        process_id: u64,
        stdout_offset: u64,
        stderr_offset: u64,
    ) -> Result<HostResult> {
        self.read_status(process_id, stdout_offset, stderr_offset)
            .await
    }
}
