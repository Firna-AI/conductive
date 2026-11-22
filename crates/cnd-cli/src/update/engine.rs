//! Update policy shared by background checks and restart-time activation.

use std::sync::Arc;

use async_trait::async_trait;
use cli_updater::{DynBinaryInstaller, DynReleaseClient};
use cnd_release::version::release_version;

use super::error::{Error, ErrorResultExt, Result};
use super::ports::{Processes, State, Store, UpdateEngine};
use super::presence::release_ready;

/// Dependencies of the sandbox updater. The composition root supplies each port.
pub struct Engine {
    /// Files and locking under the install root.
    pub store: Arc<dyn Store>,
    /// Release metadata and archive downloads.
    pub client: DynReleaseClient,
    /// Program extraction and digest verification supplied by cli-updater.
    pub installer: DynBinaryInstaller,
    /// Executable checks and system installation.
    pub processes: Arc<dyn Processes>,
}

impl Engine {
    /// The newest release after `current`, or `current` itself.
    ///
    /// With `ready_only`, a newer release counts only when each of its parts
    /// is present, so that a start never waits for a download of it.
    fn next_version(&self, current: Option<&str>, ready_only: bool) -> Result<Option<String>> {
        let mut newest = current.map(str::to_owned);
        for version in self.store.versions()? {
            let newer = match &newest {
                Some(newest) => {
                    release_version(&version).internal()? > release_version(newest).internal()?
                }
                None => true,
            };
            if newer && (!ready_only || release_ready(self.store.as_ref(), &version)) {
                newest = Some(version);
            }
        }
        Ok(newest)
    }

    /// Restore the previous release after a start without confirmation.
    ///
    /// When the previous installer fails, `current` goes back to the failed
    /// release with its pending marker. `current` also selects the updater
    /// of the next start, and an older previous release can hold an updater
    /// that repairs no part.
    fn rollback(&self, state: State) -> Result<()> {
        let failed = state.pending.ok_or(Error::InvalidRelease)?;
        let previous = state.previous.ok_or(Error::NoPrevious)?;
        self.store.reject(&failed)?;
        self.store.transition(&State {
            current: Some(previous.clone()),
            previous: Some(previous.clone()),
            pending: Some(failed.clone()),
        })?;
        if let Err(error) = self
            .processes
            .install_system(&self.store.version_path(&previous))
        {
            self.store.transition(&State {
                current: Some(failed.clone()),
                previous: Some(previous),
                pending: Some(failed),
            })?;
            return Err(error);
        }
        self.store.transition(&State {
            current: Some(previous),
            ..State::default()
        })
    }
}

#[async_trait]
impl UpdateEngine for Engine {
    async fn install(&self, running_version: &str) -> Result<()> {
        let store = self.store.clone();
        let lock = tokio::task::spawn_blocking(move || store.installation_lock())
            .await
            .internal();
        let result = match lock {
            Ok(Ok(lock)) => self.download(running_version, lock).await,
            Ok(Err(error)) | Err(error) => Err(error),
        };
        if let Err(error) = &result {
            tracing::warn!(%error, "sandbox installation check failed; keeping current release");
        }
        result
    }

    async fn check(&self, running_version: &str) -> Result<()> {
        let result = match self.store.lock() {
            Ok(Some(lock)) => self.download(running_version, lock).await,
            Ok(None) => Err(Error::Busy),
            Err(error) => Err(error),
        };
        if let Err(error) = &result {
            tracing::warn!(%error, "sandbox update check failed; keeping current release");
        }
        result
    }

    async fn apply(&self) -> Result<()> {
        let Some(_lock) = self.store.apply_lock()? else {
            return Ok(());
        };
        let state = self.store.state()?;
        if state.pending.is_some() {
            if let Some(previous) = &state.previous {
                self.restore_parts(previous).await;
                if !release_ready(self.store.as_ref(), previous) {
                    // `current` keeps the updater that repairs. The previous
                    // release can hold an older updater that repairs no part.
                    let error = Error::PreviousIncomplete {
                        version: previous.clone(),
                    };
                    tracing::warn!(%error, "the fallback waits for the next start");
                    return Err(error);
                }
            }
            return self.rollback(state);
        }
        let newest = self.next_version(state.current.as_deref(), true)?;
        if let Some(version) = &newest {
            self.restore_parts(version).await;
        }
        if newest == state.current {
            return Ok(());
        }
        let version = newest.ok_or(Error::InvalidRelease)?;
        self.store.transition(&State {
            current: Some(version.clone()),
            previous: state.current,
            pending: Some(version.clone()),
        })?;
        self.processes
            .install_system(&self.store.version_path(&version))?;
        Ok(())
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
        let next = self.next_version(state.current.as_deref(), false)?;
        let keep: Vec<_> = [state.current, state.previous, next]
            .into_iter()
            .flatten()
            .collect();
        self.store.collect(&keep)
    }
}
