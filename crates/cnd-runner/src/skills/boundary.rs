//! Replaceable storage, Git, and lifecycle boundaries for org skills.

use std::path::PathBuf;

use async_trait::async_trait;

use super::error::Result;
use super::lease::SkillsLease;

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
    async fn prepare(&self, repository: Option<&str>) -> Result<Option<PathBuf>>;
    /// Publish a complete snapshot, or no copy when the repository has no commits.
    async fn update(&self, repository: &str) -> Result<Option<PathBuf>>;
    /// Reclaim retired snapshots except those retained by the runner or live helpers.
    async fn sweep(&self, repository: &str, retained: &[PathBuf]) -> Result<()>;
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
    async fn run(&self, request: SkillsGitRequest) -> Result<String>;
}
