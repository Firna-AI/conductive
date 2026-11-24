//! Track unconfirmed starts and refuse the release that exceeded its limit.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

const MAX_STARTS: u32 = 5;

/// State stored in update.json beside the current program link.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(default)]
pub struct UpdateState {
    /// Release to restore when the pending release fails repeatedly.
    pub previous: Option<String>,
    /// Release installed but still awaiting a healthy start.
    pub pending: Option<String>,
    /// Starts of the pending release since activation.
    pub starts: u32,
    /// Releases already refused on this computer.
    pub refused: BTreeSet<String>,
}

pub(super) enum Start {
    Unchanged,
    Counted,
    RollBack,
    FinishRollback(String),
}

impl UpdateState {
    pub(super) fn register_start(&mut self, version: &str) -> Start {
        if self.pending.as_deref() == Some(version) {
            self.starts = self.starts.saturating_add(1);
            if self.starts > MAX_STARTS {
                return Start::RollBack;
            }
            return Start::Counted;
        }
        if self.starts > MAX_STARTS
            && self.previous.as_deref() == Some(version)
            && let Some(rejected) = &self.pending
        {
            return Start::FinishRollback(rejected.clone());
        }
        Start::Unchanged
    }

    pub(super) fn stage(&mut self, current: &str, next: &str) {
        self.previous = Some(current.to_owned());
        self.pending = Some(next.to_owned());
        self.starts = 0;
    }

    pub(super) fn confirm(&mut self, version: &str) -> bool {
        if self.pending.as_deref() != Some(version) {
            return false;
        }
        self.pending = None;
        self.starts = 0;
        true
    }

    pub(super) fn refuse(&mut self, version: &str) {
        self.refused.insert(version.to_owned());
        self.confirm(version);
    }
}

#[cfg(test)]
#[path = "_tests_/state_tests.rs"]
mod tests;
