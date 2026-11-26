//! Owned snapshot leases wake the background sweep after their last reader exits.

use std::path::{Path, PathBuf};
use std::sync::{Arc, Weak};

use tokio::sync::Notify;

/// A complete skills copy retained while a helper can read its files.
#[derive(Clone, Debug)]
pub struct SkillsLease(Arc<Snapshot>);

#[derive(Debug)]
pub(super) struct Snapshot {
    pub(super) path: PathBuf,
    released: Arc<Notify>,
}

impl SkillsLease {
    /// Retain a folder and notify the copy job when its last lease is released.
    pub fn new(path: PathBuf, released: Arc<Notify>) -> Self {
        Self(Arc::new(Snapshot { path, released }))
    }

    /// Immutable folder supplied to one helper start.
    pub fn path(&self) -> &Path {
        &self.0.path
    }

    pub(super) fn weak(&self) -> Weak<Snapshot> {
        Arc::downgrade(&self.0)
    }
}

impl Drop for Snapshot {
    fn drop(&mut self) {
        self.released.notify_one();
    }
}
