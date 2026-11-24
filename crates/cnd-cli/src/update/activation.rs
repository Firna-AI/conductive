//! Release selection, activation, and rollback under the apply lock.

use cnd_release::version::release_version;

use super::engine::Engine;
use super::error::{Error, ErrorResultExt, Result};
use super::ports::State;

impl Engine {
    pub(super) async fn apply_release(&self, requested: Option<&str>) -> Result<()> {
        let Some(_lock) = self.store.apply_lock()? else {
            return if requested.is_some() {
                Err(Error::ApplyBusy)
            } else {
                Ok(())
            };
        };
        let mut state = self.store.state()?;
        if let Some(version) = requested {
            self.check_requested_release(version, &state)?;
        }
        if let Some(failed) = state.pending.as_deref() {
            let requested_failed = requested == Some(failed);
            state = self.rollback(state).await?;
            let Some(version) = requested else {
                return Ok(());
            };
            if requested_failed {
                return Err(Error::ReleaseRejected {
                    version: version.to_owned(),
                });
            }
            if state.current.as_deref() == Some(version) {
                return Ok(());
            }
        }
        let selected = match requested {
            Some(version) => Some(version.to_owned()),
            None => self.next_version(state.current.as_deref())?,
        };
        if let Some(version) = &selected {
            self.restore_parts(version).await;
        }
        if selected == state.current {
            return Ok(());
        }
        let version = selected.ok_or(Error::InvalidRelease)?;
        self.store.transition(&State {
            current: Some(version.clone()),
            previous: state.current,
            pending: Some(version.clone()),
        })?;
        self.processes
            .install_system(&self.store.version_path(&version))
    }

    fn check_requested_release(&self, version: &str, state: &State) -> Result<()> {
        let Ok(requested) = release_version(version) else {
            return Err(Error::InvalidRelease);
        };
        if let Some(active) = &state.current
            && release_version(active).internal()? > requested
        {
            return Err(Error::NewerReleaseActive {
                requested: version.to_owned(),
                active: active.clone(),
            });
        }
        if state.pending.as_deref() == Some(version) {
            return Ok(());
        }
        if self.store.rejected(version)? {
            return Err(Error::ReleaseRejected {
                version: version.to_owned(),
            });
        }
        if !self
            .store
            .versions()?
            .iter()
            .any(|staged| staged == version)
        {
            return Err(Error::ReleaseNotComplete {
                version: version.to_owned(),
            });
        }
        Ok(())
    }

    pub(super) fn next_version(&self, current: Option<&str>) -> Result<Option<String>> {
        let mut newest = current.map(str::to_owned);
        for version in self.store.versions()? {
            if match &newest {
                Some(current) => {
                    release_version(&version).internal()? > release_version(current).internal()?
                }
                None => true,
            } {
                newest = Some(version);
            }
        }
        Ok(newest)
    }

    /// Restore the previous release after a start without confirmation.
    ///
    /// If its installer fails, restore the failed current release and journal.
    /// The next start then uses the same updater to try the rollback again.
    async fn rollback(&self, state: State) -> Result<State> {
        let failed = state.pending.ok_or(Error::InvalidRelease)?;
        let previous = state.previous.ok_or(Error::NoPrevious)?;
        self.restore_parts(&previous).await;
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
        let restored = State {
            current: Some(previous),
            ..State::default()
        };
        self.store.transition(&restored)?;
        Ok(restored)
    }
}
