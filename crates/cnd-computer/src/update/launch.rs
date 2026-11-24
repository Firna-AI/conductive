//! The confirmed release counts trial starts before composing the service.

use std::convert::Infallible;
use std::os::unix::process::CommandExt;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::Arc;

use cnd_release::version::DEVELOPMENT_VERSION;

use crate::diagnostics::Diagnostics;
use crate::error::{Error, Result};
use crate::releases::cache::ProgramCacheFiles;

use super::ports::UpdateFiles;
use super::state::{MAX_TRIES, UpdateState};

/// Which update path the running program can use.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Startup {
    /// Run the service with automatic updates disabled.
    Disabled,
    /// The confirmed release runs the service and checks for updates.
    Current,
    /// A trial release runs the service and waits for confirmation.
    Trial,
    /// A startup step failed. Read the release layout again on the first poll.
    Retry,
}

/// Check the update state before starting the service.
pub trait Launch: Send + Sync {
    /// Count and exec a trial from the confirmed release, or continue service setup.
    fn start(&self) -> Startup;
}

/// Replace the current process with its installed trial program.
#[cfg_attr(test, unimock::unimock(api = TrialExecMock))]
pub trait TrialExec: Send + Sync {
    /// Execute computer run with the existing process ID.
    fn exec(&self, program: &Path) -> Result<Infallible>;
}

/// Native process replacement for a trial release.
pub struct NativeExec;

impl TrialExec for NativeExec {
    fn exec(&self, program: &Path) -> Result<Infallible> {
        Err(Command::new(program)
            .args(["computer", "run"])
            .stdin(Stdio::null())
            .exec()
            .into())
    }
}

/// Startup maintenance and trial launch for the own computer service.
pub struct Launcher {
    /// Version embedded in the running executable.
    pub version: String,
    /// Installed releases and their persistent state.
    pub files: Arc<dyn UpdateFiles>,
    /// Cached release files.
    pub cache: Arc<dyn ProgramCacheFiles>,
    /// Replace the process with a trial.
    pub process: Arc<dyn TrialExec>,
    /// Update status diagnostics.
    pub diagnostics: Arc<dyn Diagnostics>,
}

impl Launch for Launcher {
    fn start(&self) -> Startup {
        let installed = self.files.clear_temporary();
        let downloads = self.cache.clear_temporary();
        if installed.is_err() || downloads.is_err() {
            self.diagnostics.update_failed();
        }
        match self.start_inner() {
            Ok(startup) => startup,
            Err(_) => {
                self.diagnostics.update_failed();
                Startup::Retry
            }
        }
    }
}

impl Launcher {
    fn start_inner(&self) -> Result<Startup> {
        if self.version == DEVELOPMENT_VERSION || !self.files.runs_version(&self.version)? {
            if self.collect_cache().is_err() {
                self.diagnostics.update_failed();
            }
            if self.version != DEVELOPMENT_VERSION {
                self.diagnostics.update_location();
            }
            return Ok(Startup::Disabled);
        }
        let current = self.files.current_version()?.ok_or(Error::UpdateLocation)?;
        let mut state = self.files.state()?;
        if current == self.version {
            self.start_from_current(&current, &mut state)?;
            Ok(Startup::Current)
        } else if state.is_running_trial(&current, &self.version) {
            self.collect(&current, &state);
            Ok(Startup::Trial)
        } else {
            Err(Error::UpdateLocation)
        }
    }

    fn collect_cache(&self) -> Result<()> {
        let current = self.files.current_version()?;
        let active = current.as_deref().unwrap_or(&self.version);
        let state = self.files.state()?;
        self.cache.collect(&state.retained(active))
    }

    fn start_from_current(&self, current: &str, state: &mut UpdateState) -> Result<()> {
        recover_current(&*self.files, &*self.diagnostics, current, state)?;
        let Some(trial) = &mut state.trial else {
            self.collect(current, state);
            return Ok(());
        };
        trial.starts += 1;
        let target = trial.version.clone();
        self.files.save(state)?;
        self.collect(current, state);
        let _ = self
            .files
            .program(&target)
            .and_then(|program| self.process.exec(&program));
        self.diagnostics.update_exec_failed();
        if recover_current(&*self.files, &*self.diagnostics, current, state)? {
            self.collect(current, state);
        }
        Ok(())
    }

    fn collect(&self, current: &str, state: &UpdateState) {
        if collect_releases(&*self.files, &*self.cache, current, state).is_err() {
            self.diagnostics.update_failed();
        }
    }
}

/// Save unfinished promotion or trial refusal when the confirmed release runs.
pub(super) fn recover_current(
    files: &dyn UpdateFiles,
    diagnostics: &dyn Diagnostics,
    current: &str,
    state: &mut UpdateState,
) -> Result<bool> {
    if state.confirm(current) || state.discard_trial_from_other_release(current) {
        files.save(state)?;
        return Ok(true);
    }
    if state
        .trial
        .as_ref()
        .is_some_and(|trial| trial.starts >= MAX_TRIES)
    {
        state.refuse_trial();
        files.save(state)?;
        diagnostics.update_refused();
        return Ok(true);
    }
    Ok(false)
}

pub(super) fn collect_releases(
    files: &dyn UpdateFiles,
    cache: &dyn ProgramCacheFiles,
    current: &str,
    state: &UpdateState,
) -> Result<()> {
    let keep = state.retained(current);
    let installed = files.collect(&keep);
    let programs = cache.collect(&keep);
    installed.and(programs)
}
