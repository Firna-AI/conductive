//! Replaceable copy, scan, report, and private-input boundaries.

use std::path::PathBuf;

use async_trait::async_trait;
use cnd_runner_interface::skills::{HelperSkillLists, SkillInput};
use futures_util::future::BoxFuture;

use crate::error::Result;

use super::error;
use super::lease::SkillsLease;

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

/// Lifecycle and last complete copy shared by independent agent sessions.
#[cfg_attr(test, unimock::unimock(api = OrgSkillsMock))]
#[async_trait]
pub trait OrgSkills: Send + Sync {
    /// Schedule the first copy without waiting for storage or Git.
    async fn start(&self);
    /// Lease the last complete immutable folder without waiting for a check.
    fn current(&self) -> Option<SkillsLease>;
    /// Cancel background work and await its cleanup.
    async fn close(&self);
}

/// Persistent copy storage, separate from the scheduling policy.
#[cfg_attr(test, unimock::unimock(api = SkillsStorageMock))]
#[async_trait]
pub trait SkillsStorage: Send + Sync {
    /// Remove an old selection and restore only a complete copy of this selection.
    async fn prepare(&self, repository: Option<&str>) -> error::Result<Option<PathBuf>>;
    /// Publish a complete snapshot, or no copy when the repository has no commits.
    async fn update(&self, repository: &str) -> error::Result<Option<PathBuf>>;
    /// Reclaim retired snapshots except those retained by the runner or live helpers.
    async fn sweep(&self, repository: &str, retained: &[PathBuf]) -> error::Result<()>;
}

/// One Git call with a private home and literal command arguments.
#[derive(Clone, Debug)]
pub struct SkillsGitRequest {
    /// Private home, outside the workspace repository and its Git configuration.
    pub home: PathBuf,
    /// Arguments after the forced empty credential helper.
    pub args: Vec<String>,
}

/// Public Git access with no inherited credential or Git configuration.
#[cfg_attr(test, unimock::unimock(api = SkillsGitMock))]
#[async_trait]
pub trait SkillsGit: Send + Sync {
    /// Run Git with a clean environment and a thirty-second time limit.
    async fn run(&self, request: SkillsGitRequest) -> error::Result<String>;
}
