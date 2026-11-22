//! When an unpacked part counts as present, and when a release is ready to start.

use std::path::Path;

use cnd_release::parts::{Part, PartsList};

use super::disk::DiskStore;
use super::error::{ErrorResultExt, Result};
use super::ports::Store;
use super::process::SYSTEM_PART;
use super::staging::NODE_PART;

/// Role whose archive holds the private SDK helper of the runner.
pub const SDK_HELPER_PART: &str = "sdk-helper";

/// Files of a part role that the program, the runner unit, or the installer call.
///
/// A lost file can leave the `complete` marker of its part on the disk, so
/// a part counts as present only with these files too.
pub fn entry_files(role: &str) -> &'static [&'static str] {
    match role {
        NODE_PART => &["bin/node"],
        SDK_HELPER_PART => &["sdk-helper.mjs"],
        SYSTEM_PART => &["runner-start.sh", "install-system.sh"],
        _ => &[],
    }
}

impl DiskStore {
    pub(super) fn part_present(&self, part: &Part) -> Result<bool> {
        Self::files_present(&self.part_path(&part.sha256), part)
    }

    pub(super) fn reachable_from(&self, version: &str, part: &Part) -> Result<bool> {
        Self::files_present(&self.version_path(version).join(&part.name), part)
    }

    fn files_present(folder: &Path, part: &Part) -> Result<bool> {
        for file in ["complete"].iter().chain(entry_files(&part.name)) {
            if !folder.join(file).try_exists().internal()? {
                return Ok(false);
            }
        }
        Ok(true)
    }
}

/// Whether each part that `version` records is present.
///
/// Apply starts a newer release, and an idle install offers one, only when
/// it is ready. A release that is not ready waits for the background check,
/// which downloads its missing parts while the runner works. A read error
/// logs a warning and counts as not ready.
pub fn release_ready(store: &dyn Store, version: &str) -> bool {
    match store.parts(version) {
        Ok(parts) => !lacks_part(store, version, &parts),
        Err(error) => {
            tracing::warn!(%error, version, "release parts could not be read");
            false
        }
    }
}

/// Whether a switch to `version` must wait, because it cannot use a listed part.
///
/// Each listed part must be reachable through the release's own link, as
/// the runner, its units, and its installer reach it. A release whose parts
/// list cannot be read gives no part to wait for, so a fallback switches
/// to it, as before the repair existed.
pub fn switch_waits(store: &dyn Store, version: &str) -> bool {
    let parts = match store.parts(version) {
        Ok(parts) => parts,
        Err(error) => {
            tracing::warn!(%error, version, "the release has no readable parts list");
            return false;
        }
    };
    parts.parts.iter().any(|part| match store.part_reachable(version, part) {
        Ok(reachable) => !reachable,
        Err(error) => {
            tracing::warn!(%error, version, part = %part.name, "a release part could not be checked");
            true
        }
    })
}

fn lacks_part(store: &dyn Store, version: &str, parts: &PartsList) -> bool {
    parts.parts.iter().any(|part| match store.has_part(part) {
        Ok(present) => !present,
        Err(error) => {
            tracing::warn!(%error, version, part = %part.name, "a release part could not be checked");
            true
        }
    })
}
