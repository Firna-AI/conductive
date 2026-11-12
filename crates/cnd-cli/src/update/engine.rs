//! Update policy shared by background checks and restart-time activation.

use std::sync::Arc;

use async_trait::async_trait;
use cli_release_interface::ReleaseAssetInfo;
use cli_updater::{DynBinaryInstaller, DynReleaseClient, UpdateCheck, Updater};
use cnd_release::files::sha256;
use cnd_release::version::{BINARY, TARGET, release_version};

use super::error::{Error, ErrorResultExt, Result};
use super::ports::{Processes, State, Store, UpdateEngine};

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
    async fn download(&self, running: &str) -> Result<()> {
        let Some(_lock) = self.store.lock()? else {
            return Err(Error::Busy);
        };
        let updater = Updater::new(self.client.clone(), self.installer.clone());
        let status = updater
            .status(UpdateCheck {
                binary: BINARY.to_owned(),
                current_version: running.to_owned(),
                target: TARGET.to_owned(),
            })
            .await
            .internal()?;
        if !status.update_available {
            return Ok(());
        }
        let release = status.latest;
        release_version(&release.version).internal()?;
        if release.binary != BINARY || release.target != TARGET {
            return Err(Error::InvalidRelease);
        }
        let digest = release.sha256.as_deref().ok_or(Error::MissingDigest)?;
        if digest.len() != 64 || !digest.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return Err(Error::MissingDigest);
        }
        if self.store.versions()?.contains(&release.version) {
            return Ok(());
        }
        let state = self.store.state()?;
        if let Some(current) = state.current
            && release_version(&release.version).internal()?
                <= release_version(&current).internal()?
        {
            return Ok(());
        }
        let archive = self.client.download(&release).await.internal()?;
        self.store.prepare(&release.version)?;
        let executable = self.store.version_path(&release.version).join(BINARY);
        self.installer
            .install(
                &archive,
                BINARY,
                &executable,
                Some(digest),
                &release.asset_name,
            )
            .internal()?;
        let parts = self.processes.inspect(&executable, &release.version)?;
        parts.validate().internal()?;
        if !["runner", "node", "system"]
            .iter()
            .all(|name| parts.parts.iter().any(|part| part.name == *name))
        {
            return Err(Error::InvalidRelease);
        }
        for part in &parts.parts {
            if self.store.has_part(&part.sha256)? {
                continue;
            }
            let asset = ReleaseAssetInfo {
                binary: part.name.clone(),
                version: release.version.clone(),
                target: TARGET.to_owned(),
                asset_name: part.name.clone(),
                download_url: part.url.clone(),
                sha256: Some(part.sha256.clone()),
            };
            let bytes = self.client.download(&asset).await.internal()?;
            if !sha256(&bytes).eq_ignore_ascii_case(&part.sha256) {
                return Err(Error::DigestMismatch {
                    name: part.name.clone(),
                });
            }
            self.store.unpack(part, &bytes)?;
        }
        self.store.complete(&release.version, &parts)
    }

    fn rollback(&self, state: State) -> Result<()> {
        let failed = state.pending.ok_or(Error::InvalidRelease)?;
        let previous = state.previous.ok_or(Error::NoPrevious)?;
        self.store.reject(&failed)?;
        self.store.transition(&State {
            current: Some(previous.clone()),
            previous: Some(previous.clone()),
            pending: Some(failed),
        })?;
        self.processes
            .install_system(&self.store.version_path(&previous))?;
        self.store.transition(&State {
            current: Some(previous),
            ..State::default()
        })
    }
}

#[async_trait]
impl UpdateEngine for Engine {
    async fn check(&self, running_version: &str) -> Result<()> {
        let result = self.download(running_version).await;
        if let Err(error) = &result {
            tracing::warn!(%error, "sandbox update check failed; keeping current release");
        }
        result
    }

    fn apply(&self) -> Result<()> {
        let Some(_lock) = self.store.apply_lock()? else {
            return Ok(());
        };
        let state = self.store.state()?;
        if state.pending.is_some() {
            return self.rollback(state);
        }
        let mut newest = state.current.clone();
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

    fn started(&self) -> Result<()> {
        let Some(_lock) = self.store.apply_lock()? else {
            return Ok(());
        };
        let mut state = self.store.state()?;
        state.pending = None;
        self.store.transition(&state)?;
        self.store.collect()
    }
}
