//! Collect private program downloads at points where no request uses the cache.

use std::path::PathBuf;

use crate::disk::{collect_temporary, collect_versions};
use crate::error::Result;

pub(super) const PROGRAMS: &str = "programs";

/// Maintenance of the verified program cache and interrupted downloads.
#[cfg_attr(test, unimock::unimock(api = ProgramCacheMock))]
pub trait ProgramCacheFiles: Send + Sync {
    /// Remove stale version folders from the program cache.
    fn collect(&self, keep: &[&str]) -> Result<()>;
    /// Remove temporary files left by downloads that were interrupted.
    fn clear_temporary(&self) -> Result<()>;
}

/// Verified downloads under the computer user's cache folder.
pub struct ProgramCache {
    /// Root of the private download cache.
    pub directory: PathBuf,
}

impl ProgramCacheFiles for ProgramCache {
    fn collect(&self, keep: &[&str]) -> Result<()> {
        collect_versions(&self.directory.join(PROGRAMS), keep)
    }

    fn clear_temporary(&self) -> Result<()> {
        collect_temporary(&self.directory)
    }
}
