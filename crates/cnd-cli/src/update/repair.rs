//! Restore the missing parts of the release that a start is about to run.

use cnd_release::parts::{Part, PartsList};

use super::engine::Engine;
use super::error::{ErrorResultExt, Result};

impl Engine {
    /// Download each missing part of `version` again before the release starts.
    ///
    /// A failure logs a warning and keeps the start, so the start behaves as
    /// it does without the repair. The next start tries again.
    pub(super) async fn restore_parts(&self, version: &str) {
        if let Err(error) = self.try_restore_parts(version).await {
            tracing::warn!(%error, version, "missing release parts could not be restored");
        }
    }

    async fn try_restore_parts(&self, version: &str) -> Result<()> {
        let parts = self.store.parts(version)?;
        if self.missing_parts(&parts)?.is_empty() {
            return Ok(());
        }
        let store = self.store.clone();
        let _lock = tokio::task::spawn_blocking(move || store.installation_lock())
            .await
            .internal()??;
        let missing = self.missing_parts(&parts)?;
        for part in &missing {
            self.download_part(version, part).await?;
        }
        tracing::info!(
            version,
            restored = missing.len(),
            "restored missing release parts"
        );
        Ok(())
    }

    fn missing_parts(&self, parts: &PartsList) -> Result<Vec<Part>> {
        let mut missing = Vec::new();
        for part in &parts.parts {
            if !self.store.has_part(&part.sha256)? {
                missing.push(part.clone());
            }
        }
        Ok(missing)
    }
}
