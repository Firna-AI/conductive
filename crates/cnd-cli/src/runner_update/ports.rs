//! Root activation and process replacement boundaries for idle runner updates.

use std::convert::Infallible;
use std::path::Path;

use async_trait::async_trait;
use tokio::sync::watch;

use crate::update::error::Result;

/// Privileged activation and unprivileged in-place execution.
#[cfg_attr(test, unimock::unimock(api = SwapProcessesMock))]
#[async_trait]
pub trait SwapProcesses: Send + Sync {
    /// Run this runner's pinned executable through noninteractive sudo.
    async fn apply(&self, executable: &Path) -> Result<()>;
    /// Replace this process. Only an execution error returns to the caller.
    fn exec(&self, start_script: &Path) -> Result<Infallible>;
}

/// Changes an already shut-down runner to a newer installed release.
#[cfg_attr(test, unimock::unimock(api = RunnerSwapMock))]
#[async_trait]
pub trait RunnerSwap: Send + Sync {
    /// Reconnect when activation changed nothing, including a failed unchanged apply.
    async fn swap(&self, shutdown: watch::Receiver<bool>) -> Result<()>;
}
