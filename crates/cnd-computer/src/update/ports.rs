//! Installed program and update state effects.

use std::path::{Path, PathBuf};

use async_trait::async_trait;

use crate::error::Result;

use super::state::UpdateState;

/// Read and change the installed program and update state.
#[cfg_attr(test, unimock::unimock(api = UpdateFilesMock))]
#[async_trait]
pub trait UpdateFiles: Send + Sync {
    /// Whether the current link resolves to the running program's folder.
    fn is_current(&self) -> Result<bool>;
    /// Load the latest update state from disk.
    fn state(&self) -> Result<UpdateState>;
    /// Save update state atomically.
    fn save(&self, state: &UpdateState) -> Result<()>;
    /// Publish a complete version through a temporary folder.
    async fn install(&self, version: &str, verified_program: &Path) -> Result<PathBuf>;
    /// Name an installed version through the current symbolic link.
    fn switch(&self, version: &str) -> Result<()>;
    /// Remove unneeded version folders.
    fn collect(&self, current: &str, previous: Option<&str>) -> Result<()>;
}
