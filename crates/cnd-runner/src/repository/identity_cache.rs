//! Raw file hashes and their descriptor metadata from one successful snapshot.

use std::collections::BTreeMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use super::io::{CachedIdentity, IdentityRead};

const REUSE_AGE: Duration = Duration::from_secs(2);

/// Each successful snapshot replaces the cache with its readable files.
#[derive(Default)]
pub(super) struct IdentityCache {
    cutoff_ns: i128,
    entries: BTreeMap<String, CachedIdentity>,
}

impl IdentityCache {
    /// Store the cutoff from the beginning of the scan, before any file opens.
    pub(super) fn new(started: SystemTime) -> Self {
        let start_ns = match started.duration_since(UNIX_EPOCH) {
            Ok(elapsed) => elapsed.as_nanos() as i128,
            Err(error) => -(error.duration().as_nanos() as i128),
        };
        Self {
            cutoff_ns: start_ns - REUSE_AGE.as_nanos() as i128,
            entries: BTreeMap::new(),
        }
    }

    /// Offer a prior hash only if its change time was outside that scan's window.
    pub(super) fn reusable(&self, path: &str) -> Option<CachedIdentity> {
        self.entries
            .get(path)
            .filter(|cached| cached.fingerprint.changed_ns <= self.cutoff_ns)
            .cloned()
    }

    /// Supply the report's identity and retain only confirmed descriptor metadata.
    pub(super) fn record(&mut self, path: &str, read: IdentityRead) -> String {
        match read {
            IdentityRead::Reused(cached) => {
                let hash = cached.hash.to_string();
                self.entries.insert(path.to_owned(), cached);
                hash
            }
            IdentityRead::Hashed { hash, fingerprint } => {
                if let Some(fingerprint) = fingerprint {
                    self.entries.insert(
                        path.to_owned(),
                        CachedIdentity {
                            fingerprint,
                            hash: Arc::from(hash.as_str()),
                        },
                    );
                }
                hash
            }
            IdentityRead::Unavailable => "unavailable".into(),
        }
    }
}
