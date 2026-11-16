//! Decide whether activation installed a newer release before replacing the process.

use std::path::PathBuf;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_release::version::release_version;
use tokio::sync::watch;

use crate::update::error::{ErrorResultExt, Result};
use crate::update::ports::Store;

use super::ports::{RunnerSwap, SwapProcesses};

/// Recheck the store after root activation, which can return without obtaining its lock.
pub struct UpdateRunner {
    /// Store at the installed sandbox root.
    pub store: Arc<dyn Store>,
    /// Privileged apply and unprivileged exec boundary.
    pub processes: Arc<dyn SwapProcesses>,
    /// Version embedded in the still-running executable.
    pub running_version: String,
    /// Canonical executable path pinned before the current link can change.
    pub executable: PathBuf,
    /// Launcher through the current link of the installation.
    pub start_script: PathBuf,
}

#[async_trait]
impl RunnerSwap for UpdateRunner {
    async fn swap(&self, shutdown: watch::Receiver<bool>) -> Result<()> {
        let applied = self.processes.apply(&self.executable).await;
        let state = self.store.state()?;
        if let Err(error) = applied {
            if state.current.as_deref() == Some(&self.running_version) && state.pending.is_none() {
                tracing::warn!(
                    "The runner update could not install; staying on the current release."
                );
                return Ok(());
            }
            return Err(error);
        }
        let current = state.current;
        let newer = match current.as_deref() {
            Some(version) => {
                release_version(version).internal()?
                    > release_version(&self.running_version).internal()?
            }
            None => false,
        };
        if newer {
            if *shutdown.borrow() || shutdown.has_changed().is_err() {
                return Ok(());
            }
            return match self.processes.exec(&self.start_script) {
                Err(error) => Err(error),
                Ok(never) => match never {},
            };
        }
        tracing::warn!("The runner update did not install a newer release; reconnecting.");
        Ok(())
    }
}

#[cfg(test)]
#[path = "_tests_/swap_tests.rs"]
mod swap_tests;
