//! Private version preparation and checked archive extraction.

use std::fs;
use std::path::{Component, PathBuf};

use cnd_release::parts::{Part, PartsList};
use flate2::read::GzDecoder;
use tar::Archive;

use super::disk::DiskStore;
use super::error::{Error, ErrorResultExt, Result};
use super::ports::Store;

/// Role whose archive contains the Node distribution's top directory.
pub const NODE_PART: &str = "node";

impl DiskStore {
    pub(super) fn prepare_version(&self, version: &str) -> Result<()> {
        let folder = self.version_path(version);
        if folder.try_exists().internal()? {
            fs::remove_dir_all(&folder).internal()?;
        }
        fs::create_dir_all(&folder).internal()?;
        fs::copy(
            std::env::current_exe().internal()?,
            folder.join("conductive"),
        )
        .internal()?;
        Ok(())
    }

    /// Unpack one part into a private folder, then publish it with one rename.
    ///
    /// A check and a repair can fetch the same part at once. Each unpacks
    /// with no lock. The store-wide publish lock covers only the last check
    /// and the rename, so a part that is present stays, and only a missing
    /// or damaged part is replaced.
    pub(super) fn unpack_part(&self, part: &Part, bytes: &[u8]) -> Result<()> {
        let target = self.part_path(&part.sha256);
        let temporary = target.with_extension(format!("partial-{}", std::process::id()));
        if temporary.try_exists().internal()? {
            fs::remove_dir_all(&temporary).internal()?;
        }
        fs::create_dir_all(&temporary).internal()?;
        let mut archive = Archive::new(GzDecoder::new(bytes));
        for entry in archive.entries().internal()? {
            let mut entry = entry.internal()?;
            let path = entry.path().internal()?.into_owned();
            if path
                .components()
                .any(|part| !matches!(part, Component::Normal(_) | Component::CurDir))
            {
                return Err(Error::InvalidRelease);
            }
            let path: PathBuf = if part.name == NODE_PART {
                path.components().skip(1).collect()
            } else {
                path
            };
            if path.as_os_str().is_empty() {
                continue;
            }
            if !entry.unpack_in(&temporary).internal()? {
                return Err(Error::InvalidRelease);
            }
        }
        if part.name == NODE_PART {
            let entries = fs::read_dir(&temporary)
                .internal()?
                .collect::<std::io::Result<Vec<_>>>()
                .internal()?;
            if entries.len() != 1 {
                return Err(Error::InvalidRelease);
            }
            let nested = entries[0].path();
            for entry in fs::read_dir(&nested).internal()? {
                let entry = entry.internal()?;
                fs::rename(entry.path(), temporary.join(entry.file_name())).internal()?;
            }
            fs::remove_dir(nested).internal()?;
        }
        fs::write(temporary.join("complete"), []).internal()?;
        let publish = self.lock_file("part-publish.lock")?;
        publish.lock().internal()?;
        if self.part_present(part)? {
            return fs::remove_dir_all(&temporary).internal();
        }
        if target.try_exists().internal()? {
            fs::remove_dir_all(&target).internal()?;
        }
        fs::rename(temporary, target).internal()
    }

    pub(super) fn finish_version(&self, version: &str, parts: &PartsList) -> Result<()> {
        let folder = self.version_path(version);
        for part in &parts.parts {
            std::os::unix::fs::symlink(self.part_path(&part.sha256), folder.join(&part.name))
                .internal()?;
        }
        fs::write(
            folder.join("parts.json"),
            serde_json::to_vec(parts).internal()?,
        )
        .internal()?;
        fs::write(folder.join("complete"), []).internal()
    }
}
