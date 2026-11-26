//! Restore the missing parts of the release that a start is about to run.

use std::time::Duration;

use cnd_release::parts::Part;
use tokio::time::{Instant, timeout};

use super::engine::Engine;

/// The longest time that one start spends on part downloads.
///
/// It stays below the runner service's start limit of 90 seconds, so the
/// start can warn and go on before systemd ends it.
const REPAIR_TIME: Duration = Duration::from_secs(60);

impl Engine {
    /// Download each missing part of `version` again before the release starts.
    ///
    /// Each part gets an equal share of the time that is left. A failed
    /// download, or a download that uses up its share, logs a warning, and
    /// the next part still gets its attempt. The start then goes on, and the
    /// next start tries again. The repair takes no download lock. A
    /// background check can delay it only for the rename of a part.
    pub(super) async fn restore_parts(&self, version: &str) {
        let parts = match self.store.parts(version) {
            Ok(parts) => parts,
            Err(error) => {
                tracing::warn!(%error, version, "release parts could not be read");
                return;
            }
        };
        let missing: Vec<&Part> = parts
            .parts
            .iter()
            .filter(|part| self.part_missing(version, part))
            .collect();
        let deadline = Instant::now() + REPAIR_TIME;
        for (index, part) in missing.iter().enumerate() {
            let left = u32::try_from(missing.len() - index).unwrap_or(u32::MAX);
            let share = deadline.saturating_duration_since(Instant::now()) / left;
            match timeout(share, self.download_part(version, part)).await {
                Ok(Ok(())) => {
                    tracing::info!(version, part = %part.name, "restored a missing release part")
                }
                Ok(Err(error)) => {
                    tracing::warn!(%error, version, part = %part.name, "a missing release part could not be restored")
                }
                Err(_) => {
                    tracing::warn!(version, part = %part.name, "a missing release part did not download in time")
                }
            }
        }
    }

    fn part_missing(&self, version: &str, part: &Part) -> bool {
        match self.store.has_part(part) {
            Ok(present) => !present,
            Err(error) => {
                tracing::warn!(%error, version, part = %part.name, "a release part could not be checked");
                false
            }
        }
    }
}
