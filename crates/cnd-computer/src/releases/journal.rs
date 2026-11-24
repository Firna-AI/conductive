//! Keep proof of an interrupted base import across process restarts.

use std::fs;
use std::io;
use std::path::PathBuf;

use crate::disk::{atomic_write, private_directory};
use crate::error::{Error, Result};
use crate::wire::valid_version;

use super::ports::ImageJournal;

/// Disk journal in the private release cache.
pub struct LoadJournal {
    /// Cache folder for base import markers.
    pub path: PathBuf,
}

impl LoadJournal {
    fn marker(&self, version: &str) -> Result<PathBuf> {
        if !valid_version(version) {
            return Err(Error::ReleaseInvalid);
        }
        Ok(self.path.join(version))
    }
}

impl ImageJournal for LoadJournal {
    fn incomplete(&self, version: &str) -> Result<bool> {
        match fs::symlink_metadata(self.marker(version)?) {
            Ok(_) => Ok(true),
            Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(false),
            Err(error) => Err(error.into()),
        }
    }

    fn start(&self, version: &str) -> Result<()> {
        let marker = self.marker(version)?;
        private_directory(&self.path)?;
        atomic_write(&marker, b"")
    }

    fn complete(&self, version: &str) -> Result<()> {
        fs::remove_file(self.marker(version)?)?;
        Ok(())
    }
}
