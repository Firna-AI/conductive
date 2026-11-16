//! Share release readiness and an idle swap attempt across fresh runner instances.

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use async_trait::async_trait;
use cnd_runner::error;
use cnd_runner::update::{NoUpdates, ReleaseReadiness, ReleaseStatus};
use tokio::sync::watch;

use crate::update::error::Result;

use super::ports::RunnerSwap;

/// Permit one idle update attempt across every runner instance in this process.
pub struct IdleUpdates {
    releases: Arc<dyn ReleaseReadiness>,
    updater: Arc<dyn RunnerSwap>,
    attempted: AtomicBool,
}

impl IdleUpdates {
    /// Share the installed release reader and activation boundary.
    pub fn new(releases: Arc<dyn ReleaseReadiness>, updater: Arc<dyn RunnerSwap>) -> Self {
        Self {
            releases,
            updater,
            attempted: AtomicBool::new(false),
        }
    }
}

impl ReleaseReadiness for IdleUpdates {
    fn status(&self) -> error::Result<ReleaseStatus> {
        if self.attempted.load(Ordering::Acquire) {
            return NoUpdates.status();
        }
        self.releases.status()
    }
}

#[async_trait]
impl RunnerSwap for IdleUpdates {
    async fn swap(&self, shutdown: watch::Receiver<bool>) -> Result<()> {
        if self.attempted.swap(true, Ordering::AcqRel) {
            return Ok(());
        }
        self.updater.swap(shutdown).await
    }
}

#[cfg(test)]
#[path = "_tests_/idle_tests.rs"]
mod idle_tests;
