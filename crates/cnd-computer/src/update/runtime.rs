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
use crate::timer::Timer;

use super::launch::{Startup, collect_releases, recover_current};
use super::ports::UpdateFiles;
use super::state::{MAX_TRIES, UpdateState};

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
            _ = self.poll(startup, stop) => {}
        }
    }
}

impl Updater {
    async fn wait_for_first_poll(&self, startup: Startup) {
        let mut first_check = self.timer.wait(FIRST_CHECK);
        if startup == Startup::Trial {
            tokio::select! {
                biased;
                _ = &mut first_check => return,
                _ = self.activity.first_welcome() => {
                    let result = self.running_state().and_then(|(current, mut state)| {
                        self.confirm(&current, &mut state)
                    });
                    if result.is_err() {
                        self.diagnostics.update_failed();
                    }
                }
            }
        }
        first_check.await;
    }

    fn running_state(&self) -> Result<(String, UpdateState)> {
        let current = self.files.current_version()?.ok_or(Error::UpdateLocation)?;
        if !self.files.runs_version(&self.version)? {
            return Err(Error::UpdateLocation);
        }
        Ok((current, self.files.state()?))
    }

    fn confirm(&self, current: &str, state: &mut UpdateState) -> Result<()> {
        if current != self.version {
            if !state.is_running_trial(current, &self.version) {
                return Err(Error::UpdateLocation);
            }
            self.files.switch(&self.version)?;
        }
        if state.confirm(&self.version) {
            self.files.save(state)?;
        }
        Ok(())
    }

    async fn poll(&self, startup: Startup, stop: watch::Sender<bool>) {
        self.wait_for_first_poll(startup).await;
        loop {
            match self.poll_once(&stop).await {
                Ok(true) => return,
                Ok(false) => {}
                Err(_) => self.diagnostics.update_failed(),
            }
            self.timer.wait(CHECK_INTERVAL).await;
        }
    }

    async fn poll_once(&self, stop: &watch::Sender<bool>) -> Result<bool> {
        let (current, mut state) = self.running_state()?;
        if current != self.version {
            self.confirm(&current, &mut state)?;
            return Ok(false);
        }
        if recover_current(&*self.files, &*self.diagnostics, &current, &mut state)? {
            return Ok(false);
        }
        let candidate = if state.trial.is_some() {
            None
        } else {
            let Some(version) = self.prepare().await? else {
                return Ok(false);
            };
            Some(version)
        };
        let _idle = self.activity.idle().await;
        self.restart_with_trial(candidate.as_deref(), stop)
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

    fn restart_with_trial(
        &self,
        candidate: Option<&str>,
        stop: &watch::Sender<bool>,
    ) -> Result<bool> {
        let (current, mut state) = self.running_state()?;
        if current != self.version {
            return Ok(false);
        }
        let staged = match &state.trial {
            Some(trial) if trial.from == current && trial.starts < MAX_TRIES => false,
            Some(_) => return Ok(false),
            None => {
                let Some(version) = candidate.filter(|version| !state.refused.contains(*version))
                else {
                    return Ok(false);
                };
                state.stage(&current, version);
                true
            }
        };
        self.files.save(&state)?;
        collect_releases(&*self.files, &*self.cache, &current, &state)?;
        if staged {
            self.diagnostics.update_trial_staged();
        }
        stop.send_replace(true);
        Ok(true)
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
