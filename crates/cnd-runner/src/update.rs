//! Installed release readiness supplied by the runner's composition root.

use std::time::Duration;

use tokio::time::Instant;

use crate::error::Result;

/// Local release conditions required before an idle runner can change release.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct ReleaseStatus {
    /// A complete, non-rejected release is newer than this runner.
    pub newer_available: bool,
    /// Current names this runner's release and no start confirmation is pending.
    pub confirmed: bool,
}

/// Reads release readiness without downloading or activating software.
#[cfg_attr(test, unimock::unimock(api = ReleaseReadinessMock))]
pub trait ReleaseReadiness: Send + Sync {
    /// Inspect the local release store without retaining an update lock.
    fn status(&self) -> Result<ReleaseStatus>;
}

/// Disable release changes for a runner embedded without an installation store.
pub struct NoUpdates;

impl ReleaseReadiness for NoUpdates {
    fn status(&self) -> Result<ReleaseStatus> {
        Ok(ReleaseStatus::default())
    }
}

#[derive(Default)]
pub(crate) struct IdleUpdate {
    idle_since: Option<Instant>,
}

impl IdleUpdate {
    pub(crate) fn reset(&mut self) {
        self.idle_since = None;
    }

    pub(crate) fn observe(&mut self, now: Instant, busy: bool, release: ReleaseStatus) -> bool {
        if busy {
            self.reset();
            return false;
        }
        let since = self.idle_since.get_or_insert(now);
        now.saturating_duration_since(*since) >= Duration::from_secs(120)
            && release.newer_available
            && release.confirmed
    }
}
