//! Verify candidate releases in the background and switch while no request is pending.

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use cnd_release::version::{BINARY, DEVELOPMENT_VERSION, release_version};
use tokio::sync::watch;

use crate::activity::Activity;
use crate::diagnostics::Diagnostics;
use crate::error::{Error, Result};
use crate::process::{Invocation, Process};
use crate::releases::ports::Releases;
use crate::settings::SettingsStore;
use crate::timer::Timer;

use super::ports::UpdateFiles;
use super::state::Start;

const CONFIRM_AFTER: Duration = Duration::from_secs(60);
const FIRST_CHECK: Duration = Duration::from_secs(60);
const CHECK_INTERVAL: Duration = Duration::from_secs(10 * 60);

/// Whether to run or replace the current process after reading update state.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Startup {
    /// The service runs without automatic updates.
    Disabled,
    /// The service starts its automatic update monitor.
    Ready,
    /// The previous release is current again. Exit with failure for systemd.
    RolledBack,
}

/// Automatic updates for the own computer program.
#[async_trait]
pub trait Updates: Send + Sync {
    /// Count this start and roll back when the pending release exceeded its limit.
    fn start(&self) -> Result<Startup>;
    /// Confirm a healthy start and check for newer releases until shutdown.
    async fn monitor(&self, stop: watch::Sender<bool>, shutdown: watch::Receiver<bool>);
}

/// Self-update coordinator with signed release, process, and disk effects.
pub struct Updater {
    /// Release embedded in this instance of the program.
    pub version: String,
    /// Installed versions, current link, and persistent state.
    pub files: Arc<dyn UpdateFiles>,
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
    fn start(&self) -> Result<Startup> {
        if self.version == DEVELOPMENT_VERSION {
            return Ok(Startup::Disabled);
        }
        if !matches!(self.files.is_current(), Ok(true)) {
            self.diagnostics.update_location();
            return Ok(Startup::Disabled);
        }
        let Ok(mut state) = self.files.state() else {
            self.diagnostics.update_failed();
            return Ok(Startup::Disabled);
        };
        match state.register_start(&self.version) {
            Start::Unchanged => {}
            Start::Counted => self.files.save(&state)?,
            Start::RollBack => {
                let previous = state.previous.clone().ok_or(Error::UpdateLocation)?;
                self.files.save(&state)?;
                self.files.switch(&previous)?;
                state.refuse(&self.version);
                self.files.save(&state)?;
                self.collect(&previous, None);
                self.diagnostics.update_rolled_back();
                return Ok(Startup::RolledBack);
            }
            Start::FinishRollback(rejected) => {
                state.refuse(&rejected);
                self.files.save(&state)?;
            }
        }
        self.collect(&self.version, state.previous.as_deref());
        Ok(Startup::Ready)
    }

    async fn monitor(&self, stop: watch::Sender<bool>, mut shutdown: watch::Receiver<bool>) {
        if *shutdown.borrow() {
            return;
        }
        tokio::select! {
            biased;
            _ = shutdown.changed() => {}
            _ = async {
                tokio::join!(self.confirm(), self.poll(stop));
            } => {}
        }
    }
}

impl Updater {
    async fn confirm(&self) {
        tokio::select! {
            _ = self.activity.first_welcome() => {}
            _ = self.timer.wait(CONFIRM_AFTER) => {}
        }
        if self.confirm_state().is_err() {
            self.diagnostics.update_failed();
        }
    }

    fn confirm_state(&self) -> Result<()> {
        let mut state = self.files.state()?;
        if state.confirm(&self.version) {
            self.files.save(&state)?;
        }
        Ok(())
    }

    async fn poll(&self, stop: watch::Sender<bool>) {
        self.timer.wait(FIRST_CHECK).await;
        loop {
            match self.prepare().await {
                Ok(Some(version)) => {
                    let _idle = self.activity.idle().await;
                    if self.activate(&version).is_ok() {
                        self.diagnostics.update_activated();
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
        if state.refused.contains(version) {
            return Ok(None);
        }
        let verified = self
            .releases
            .verified_program(&settings.release_server, &release)
            .await?;
        let executable = self.files.install(version, &verified).await?;
        if let Err(error) = self.check_program(executable, version).await {
            self.collect(&self.version, state.previous.as_deref());
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
        if !self.files.is_current()? {
            return Err(Error::UpdateLocation);
        }
        let mut state = self.files.state()?;
        state.stage(&self.version, version);
        self.files.save(&state)?;
        self.files.switch(version)?;
        self.collect(version, Some(&self.version));
        Ok(())
    }

    fn collect(&self, current: &str, previous: Option<&str>) {
        if self.files.collect(current, previous).is_err() {
            self.diagnostics.update_failed();
        }
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
