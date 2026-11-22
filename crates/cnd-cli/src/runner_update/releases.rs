//! Runner release readiness over the updater's version store.

use std::sync::Arc;

use cnd_release::version::{DEVELOPMENT_VERSION, release_version};
use cnd_runner::error::{ErrorResultExt, Result};
use cnd_runner::update::{ReleaseReadiness, ReleaseStatus};

use crate::update::ports::Store;
use crate::update::presence::release_ready;

/// Compare this runner with the install root's ready, non-rejected releases.
pub struct RunnerReleases {
    /// Release store shared with the sandbox updater.
    pub store: Arc<dyn Store>,
    /// Version embedded in the running executable.
    pub running_version: String,
}

impl ReleaseReadiness for RunnerReleases {
    fn status(&self) -> Result<ReleaseStatus> {
        if self.running_version == DEVELOPMENT_VERSION {
            return Ok(ReleaseStatus::default());
        }
        let running = release_version(&self.running_version).internal()?;
        let state = self.store.state().internal()?;
        let mut newer_available = false;
        for version in self.store.versions().internal()? {
            newer_available |= release_version(&version).internal()? > running
                && release_ready(self.store.as_ref(), &version);
        }
        Ok(ReleaseStatus {
            newer_available,
            confirmed: state.current.as_deref() == Some(&self.running_version)
                && state.pending.is_none(),
        })
    }
}
