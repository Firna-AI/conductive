//! Update policy shared by background checks and restart-time activation.

use std::sync::Arc;

use async_trait::async_trait;
use cli_updater::DynBinaryInstaller;

use super::download::ReleaseSelection;
use super::error::{Error, ErrorResultExt, Result};
use super::ports::{Processes, ReleaseSource, Store, UpdateEngine};

/// Dependencies of the sandbox updater. The composition root supplies each port.
pub struct Engine {
    /// Files and locking under the install root.
    pub store: Arc<dyn Store>,
    /// Release metadata and archive downloads.
    pub client: Arc<dyn ReleaseSource>,
    /// Program extraction and digest verification supplied by cli-updater.
    pub installer: DynBinaryInstaller,
    /// Executable checks and system installation.
    pub processes: Arc<dyn Processes>,
}

impl Engine {
    async fn install_release(&self, selection: ReleaseSelection<'_>) -> Result<()> {
        let store = self.store.clone();
        let lock = tokio::task::spawn_blocking(move || store.installation_lock())
            .await
            .internal();
        let result = match lock {
            Ok(Ok(lock)) => self.download(selection, lock).await,
            Ok(Err(error)) | Err(error) => Err(error),
        };
        if let Err(error) = &result {
            tracing::warn!(%error, "sandbox installation check failed; keeping current release");
        }
        result
    }
}

#[async_trait]
impl UpdateEngine for Engine {
    async fn install(&self, running_version: &str) -> Result<()> {
        self.install_release(ReleaseSelection::Latest(running_version))
            .await
    }

    async fn install_pinned(&self, version: &str, digest: &str) -> Result<()> {
        self.install_release(ReleaseSelection::Pinned { version, digest })
            .await
    }

    async fn check(&self, running_version: &str) -> Result<()> {
        let result = match self.store.lock() {
            Ok(Some(lock)) => {
                self.download(ReleaseSelection::Latest(running_version), lock)
                    .await
            }
            Ok(None) => Err(Error::Busy),
            Err(error) => Err(error),
        };
        if let Err(error) = &result {
            tracing::warn!(%error, "sandbox update check failed; keeping current release");
        }
        result
    }

    async fn apply(&self) -> Result<()> {
        self.apply_release(None).await
    }

    async fn apply_pinned(&self, version: &str) -> Result<()> {
        self.apply_release(Some(version)).await
    }

    fn started(&self, running_version: &str) -> Result<()> {
        let Some(_lock) = self.store.apply_lock()? else {
            return Ok(());
        };
        let mut state = self.store.state()?;
        if state.current.as_deref() != Some(running_version)
            || state
                .pending
                .as_deref()
                .is_some_and(|pending| pending != running_version)
        {
            return Ok(());
        }
        state.pending = None;
        self.store.transition(&state)?;
        let Some(_download_lock) = self.store.lock()? else {
            return Ok(());
        };
        let state = self.store.state()?;
        let next = self.next_version(state.current.as_deref())?;
        let keep: Vec<_> = [state.current, state.previous, next]
            .into_iter()
            .flatten()
            .collect();
        self.store.collect(&keep)
    }
}
