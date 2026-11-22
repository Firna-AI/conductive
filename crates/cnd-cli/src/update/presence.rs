//! When an unpacked part counts as present, and when a release is ready to start.

use cnd_release::parts::Part;

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
        let folder = self.part_path(&part.sha256);
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
    let parts = match store.parts(version) {
        Ok(parts) => parts,
        Err(error) => {
            tracing::warn!(%error, version, "release parts could not be read");
            return false;
        }
    };
    parts.parts.iter().all(|part| match store.has_part(part) {
        Ok(present) => present,
        Err(error) => {
            tracing::warn!(%error, version, part = %part.name, "a release part could not be checked");
            false
        }
    })
}
