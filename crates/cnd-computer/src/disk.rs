//! Private folders and atomic replacement of small state files.

use std::fs::{self, DirBuilder, Permissions};
use std::io::Write;
use std::os::unix::fs::{DirBuilderExt, PermissionsExt};
use std::path::Path;

use tempfile::NamedTempFile;

use crate::error::{Error, Result};

pub(crate) fn private_directory(path: &Path) -> Result<()> {
    DirBuilder::new().mode(0o700).recursive(true).create(path)?;
    fs::set_permissions(path, Permissions::from_mode(0o700))?;
    Ok(())
}

pub(crate) fn atomic_write(path: &Path, bytes: &[u8]) -> Result<()> {
    let parent = path.parent().ok_or(Error::InvalidSettings)?;
    let mut file = NamedTempFile::new_in(parent)?;
    file.as_file_mut().write_all(bytes)?;
    file.as_file()
        .set_permissions(Permissions::from_mode(0o600))?;
    file.as_file().sync_all()?;
    match file.persist(path) {
        Ok(_) => Ok(()),
        Err(error) => Err(Error::from(error.error)),
    }
}
