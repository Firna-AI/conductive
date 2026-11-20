//! Replaceable scan, report, and private-input boundaries.

use async_trait::async_trait;
use cnd_runner_interface::skills::{HelperSkillLists, SkillInput};
use futures_util::future::BoxFuture;

use crate::error::Result;

/// SDK discovery is kept behind private helper pipes.
#[cfg_attr(test, unimock::unimock(api = SkillScannerMock))]
#[async_trait]
pub trait SkillScanner: Send + Sync {
    /// Capture both agent lists. Reload forces a fresh Codex app-server query.
    async fn scan(&self, reload: bool) -> Result<HelperSkillLists>;
    /// Cancel pending scans and wait for helper cleanup.
    async fn close(&self);
}

/// Current private Codex paths used at each member send.
#[cfg_attr(test, unimock::unimock(api = SkillInputsMock))]
pub trait SkillInputs: Send + Sync {
    /// Return paths for skills that survived the latest report filter.
    fn current(&self) -> Result<Vec<SkillInput>>;
}

/// Connections, watcher events, and refresh requests share one ordered scan queue.
#[cfg_attr(test, unimock::unimock(api = SkillReportsMock))]
#[async_trait]
pub trait SkillReports: Send + Sync {
    /// A full refresh sends an unchanged list and reloads the app-server list.
    fn refresh(&self, full: bool, command_id: Option<String>) -> BoxFuture<'static, Result<()>>;
    /// Stop reports and cancel a pending scanner request.
    async fn close(&self);
}
