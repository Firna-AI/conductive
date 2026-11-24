//! The confirmed release counts trial starts before composing the service.

use std::convert::Infallible;
use std::os::unix::process::CommandExt;
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::Arc;

use cnd_release::version::DEVELOPMENT_VERSION;

use crate::diagnostics::Diagnostics;
use crate::error::Result;
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
}

/// Check the update state before starting the service.
pub trait Launch: Send + Sync {
    /// Count and exec a trial from the confirmed release, or continue service setup.
    fn start(&self) -> Startup;
}

/// Replace the current process with its installed trial program.
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
                Startup::Disabled
            }
        }
    }
}

impl Launcher {
    fn start_inner(&self) -> Result<Startup> {
        let mut state = self.files.state()?;
        let current = self.files.current_version()?;
        let active = current.as_deref().unwrap_or(&self.version);
        let startup = self.role(current.as_deref(), &state)?;
        match startup {
            Startup::Disabled => {
                if self.cache.collect(&state.retained(active)).is_err() {
                    self.diagnostics.update_failed();
                }
                if self.version != DEVELOPMENT_VERSION {
                    self.diagnostics.update_location();
                }
            }
            Startup::Current => self.start_from_current(active, &mut state)?,
            Startup::Trial => self.collect(active, &state),
        }
        Ok(startup)
    }

    fn role(&self, current: Option<&str>, state: &UpdateState) -> Result<Startup> {
        if self.version == DEVELOPMENT_VERSION {
            return Ok(Startup::Disabled);
        }
        let Some(current) = current else {
            return Ok(Startup::Disabled);
        };
        if !self.files.runs_version(&self.version)? {
            return Ok(Startup::Disabled);
        }
        Ok(if current == self.version {
            Startup::Current
        } else if state.trial.as_ref().is_some_and(|trial| {
            trial.from == current && trial.version == self.version && trial.starts > 0
        }) {
            Startup::Trial
        } else {
            Startup::Disabled
        })
    }

    fn start_from_current(&self, current: &str, state: &mut UpdateState) -> Result<()> {
        if state.confirm(current) || state.discard_trial_from_other_release(current) {
            self.files.save(state)?;
        }
        let Some(trial) = &mut state.trial else {
            self.collect(current, state);
            return Ok(());
        };
        let target = trial.version.clone();
        if trial.starts < MAX_TRIES {
            trial.starts += 1;
            let starts = trial.starts;
            self.files.save(state)?;
            self.collect(current, state);
            let _ = self
                .files
                .program(&target)
                .and_then(|program| self.process.exec(&program));
            self.diagnostics.update_exec_failed();
            if starts < MAX_TRIES {
                return Ok(());
            }
        }
        state.refuse_trial();
        self.files.save(state)?;
        self.collect(current, state);
        self.diagnostics.update_refused();
        Ok(())
    }

    fn collect(&self, current: &str, state: &UpdateState) {
        collect_releases(
            &*self.files,
            &*self.cache,
            &*self.diagnostics,
            current,
            state,
        );
    }
}

pub(super) fn collect_releases(
    files: &dyn UpdateFiles,
    cache: &dyn ProgramCacheFiles,
    diagnostics: &dyn Diagnostics,
    current: &str,
    state: &UpdateState,
) {
    let keep = state.retained(current);
    let installed = files.collect(&keep);
    let programs = cache.collect(&keep);
    if installed.is_err() || programs.is_err() {
        diagnostics.update_failed();
    }
}
