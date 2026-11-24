//! Verify candidate releases in the background and switch while no request is pending.

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use cnd_release::version::{BINARY, release_version};
use tokio::sync::watch;

use crate::activity::Activity;
use crate::diagnostics::Diagnostics;
use crate::error::{Error, Result};
use crate::process::{Invocation, Process};
use crate::releases::cache::ProgramCacheFiles;
use crate::releases::ports::Releases;
use crate::settings::SettingsStore;
use crate::timer::{Timer, Wait};

use super::launch::{Startup, collect_releases};
use super::ports::UpdateFiles;

const CONFIRM_AFTER: Duration = Duration::from_secs(60);
const FIRST_CHECK: Duration = Duration::from_secs(60);
const CHECK_INTERVAL: Duration = Duration::from_secs(10 * 60);

/// Automatic updates for the own computer program.
#[async_trait]
pub trait Updates: Send + Sync {
    /// Confirm a healthy trial and check for newer releases until shutdown.
    async fn monitor(
        &self,
        startup: Startup,
        stop: watch::Sender<bool>,
        shutdown: watch::Receiver<bool>,
    );
}

/// Self-update coordinator with signed release, process, and disk effects.
pub struct Updater {
    /// Release embedded in this instance of the program.
    pub version: String,
    /// Installed versions, current link, and persistent state.
    pub files: Arc<dyn UpdateFiles>,
    /// Cached downloads to collect while no request is pending.
    pub cache: Arc<dyn ProgramCacheFiles>,
    /// Saved release endpoint, reloaded at every poll.
    pub settings: Arc<dyn SettingsStore>,
    /// Signature-checked releases.
    pub releases: Arc<dyn Releases>,
    /// Run the candidate program's version check.
    pub process: Arc<dyn Process>,
    /// Pending requests and first welcome.
    pub activity: Arc<Activity>,
    /// Waits for confirmation and polling.
    pub timer: Arc<dyn Timer>,
    /// Fixed status messages for updates.
    pub diagnostics: Arc<dyn Diagnostics>,
}

#[async_trait]
impl Updates for Updater {
    async fn monitor(
        &self,
        startup: Startup,
        stop: watch::Sender<bool>,
        mut shutdown: watch::Receiver<bool>,
    ) {
        if startup == Startup::Disabled || *shutdown.borrow() {
            return;
        }
        tokio::select! {
            biased;
            _ = shutdown.changed() => {}
            _ = async {
                let first_check = self.timer.wait(FIRST_CHECK);
                if startup == Startup::Trial && self.confirm().await.is_err() {
                    self.diagnostics.update_failed();
                    return;
                }
                self.poll(first_check, stop).await;
            } => {}
        }
    }
}

impl Updater {
    async fn confirm(&self) -> Result<()> {
        tokio::select! {
            _ = self.activity.first_welcome() => {}
            _ = self.timer.wait(CONFIRM_AFTER) => {}
        }
        let mut state = self.files.state()?;
        let trial = state.trial.as_ref().ok_or(Error::UpdateLocation)?;
        if trial.version != self.version
            || self.files.current_version()?.as_deref() != Some(&trial.from)
        {
            return Err(Error::UpdateLocation);
        }
        self.files.switch(&self.version)?;
        state.confirm(&self.version);
        self.files.save(&state)
    }

    async fn poll(&self, first_check: Wait, stop: watch::Sender<bool>) {
        first_check.await;
        loop {
            match self.prepare().await {
                Ok(Some(version)) => {
                    let _idle = self.activity.idle().await;
                    if self.activate(&version).is_ok() {
                        self.diagnostics.update_trial_staged();
                        stop.send_replace(true);
                        return;
                    }
                    self.diagnostics.update_failed();
                }
                Ok(None) => {}
                Err(_) => self.diagnostics.update_failed(),
            }
            self.timer.wait(CHECK_INTERVAL).await;
        }
    }

    async fn prepare(&self) -> Result<Option<String>> {
        let Some(settings) = self.settings.read().await? else {
            return Ok(None);
        };
        let release = self.releases.latest(&settings.release_server).await?;
        let version = &release.identity().version;
        let Ok(current) = release_version(&self.version) else {
            return Err(Error::ReleaseInvalid);
        };
        let Ok(next) = release_version(version) else {
            return Err(Error::ReleaseInvalid);
        };
        if next <= current {
            return Ok(None);
        }
        let state = self.files.state()?;
        if state.trial.is_some() || state.refused.contains(version) {
            return Ok(None);
        }
        let verified = self
            .releases
            .verified_program(&settings.release_server, &release)
            .await?;
        let executable = self.files.install(version, &verified).await?;
        if let Err(error) = self.check_program(executable, version).await {
            if self.files.collect(&state.retained(&self.version)).is_err() {
                self.diagnostics.update_failed();
            }
            return Err(error);
        }
        Ok(Some(version.clone()))
    }

    async fn check_program(&self, executable: PathBuf, version: &str) -> Result<()> {
        let invocation = Invocation::new(executable, ["--version"]);
        let output = tokio::select! {
            result = self.process.run(invocation) => result?,
            _ = self.timer.wait(Duration::from_secs(10)) => return Err(Error::UpdateProgramVersion),
        };
        let reported = output.stdout.strip_suffix(b"\n").unwrap_or(&output.stdout);
        if !output.status.success() || reported != format!("{BINARY} {version}").as_bytes() {
            return Err(Error::UpdateProgramVersion);
        }
        Ok(())
    }

    fn activate(&self, version: &str) -> Result<()> {
        if self.files.current_version()?.as_deref() != Some(&self.version) {
            return Err(Error::UpdateLocation);
        }
        let mut state = self.files.state()?;
        if state.trial.is_some() {
            return Err(Error::UpdateLocation);
        }
        state.stage(&self.version, version);
        self.files.save(&state)?;
        collect_releases(
            &*self.files,
            &*self.cache,
            &*self.diagnostics,
            &self.version,
            &state,
        );
        Ok(())
    }
}

#[cfg(test)]
#[path = "_tests_/runtime_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "_tests_/poll_tests.rs"]
mod poll_tests;

#[cfg(test)]
#[path = "_tests_/support.rs"]
mod support;
