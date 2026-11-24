//! Private folders and atomic replacement of small state files.

use std::ffi::OsStr;
use std::fs::{self, DirBuilder, Permissions};
use std::io::{self, Write};
use std::os::unix::fs::{DirBuilderExt, PermissionsExt};
use std::path::Path;

use cnd_release::version::release_version;
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

pub(crate) fn collect_versions(path: &Path, keep: &[&str]) -> Result<()> {
    let Some(entries) = directory_entries(path)? else {
        return Ok(());
    };
    for entry in entries {
        let entry = entry?;
        let name = entry.file_name();
        if name
            .to_str()
            .is_some_and(|version| !keep.contains(&version) && release_version(version).is_ok())
            && entry.file_type()?.is_dir()
        {
            fs::remove_dir_all(entry.path())?;
        }
    }
    Ok(())
}

pub(crate) fn collect_temporary(path: &Path) -> Result<()> {
    let Some(entries) = directory_entries(path)? else {
        return Ok(());
    };
    for entry in entries {
        let entry = entry?;
        if is_temporary(&entry.file_name()) {
            let kind = entry.file_type()?;
            if kind.is_file() {
                fs::remove_file(entry.path())?;
            } else if kind.is_dir() {
                fs::remove_dir_all(entry.path())?;
            }
        }
    }
    Ok(())
}

fn directory_entries(path: &Path) -> Result<Option<fs::ReadDir>> {
    match fs::read_dir(path) {
        Ok(entries) => Ok(Some(entries)),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

/// Recognize the default names of files and folders made by tempfile.
fn is_temporary(name: &OsStr) -> bool {
    name.as_encoded_bytes()
        .strip_prefix(b".tmp")
        .is_some_and(|suffix| suffix.len() == 6 && suffix.iter().all(u8::is_ascii_alphanumeric))
}
