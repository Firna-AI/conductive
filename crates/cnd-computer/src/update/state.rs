//! The last confirmed release and the candidate currently on trial.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

pub(super) const MAX_TRIES: u32 = 5;

/// State stored in update.json beside the current program link.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(default)]
pub struct UpdateState {
    /// Confirmed version that preceded the current release.
    pub previous: Option<String>,
    /// Installed candidate that still needs to confirm.
    pub trial: Option<Trial>,
    /// Releases that used all of their tries.
    pub refused: BTreeSet<String>,
}

/// A candidate staged by the confirmed release.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
pub struct Trial {
    /// Version that staged this trial and owns its tries.
    pub from: String,
    /// Candidate version.
    pub version: String,
    /// Attempts the confirmed program already started.
    pub starts: u32,
}

impl UpdateState {
    pub(super) fn is_running_trial(&self, current: &str, version: &str) -> bool {
        self.trial.as_ref().is_some_and(|trial| {
            trial.from == current && trial.version == version && trial.starts > 0
        })
    }

    pub(super) fn stage(&mut self, current: &str, next: &str) {
        self.trial = Some(Trial {
            from: current.to_owned(),
            version: next.to_owned(),
            starts: 0,
        });
    }

    pub(super) fn confirm(&mut self, version: &str) -> bool {
        let Some(trial) = self.trial.take_if(|trial| trial.version == version) else {
            return false;
        };
        self.previous = Some(trial.from);
        true
    }

    pub(super) fn discard_trial_from_other_release(&mut self, current: &str) -> bool {
        self.trial.take_if(|trial| trial.from != current).is_some()
    }

    pub(super) fn refuse_trial(&mut self) {
        if let Some(trial) = self.trial.take() {
            self.refused.insert(trial.version);
        }
    }

    pub(super) fn retained<'a>(&'a self, current: &'a str) -> Vec<&'a str> {
        std::iter::once(current)
            .chain(self.previous.as_deref())
            .chain(self.trial.as_ref().map(|trial| trial.version.as_str()))
            .collect()
    }
}

#[cfg(test)]
#[path = "_tests_/state_tests.rs"]
mod tests;
