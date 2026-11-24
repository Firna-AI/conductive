//! Install the single regular program from a verified archive.

use std::fs::{self, File, Permissions};
use std::io::{self, Read};
use std::os::unix::fs::PermissionsExt;
use std::path::Path;

use flate2::read::GzDecoder;
use tar::Archive;
use tempfile::NamedTempFile;

use crate::disk::private_directory;
use crate::error::{Error, Result};

pub(super) const PROGRAM_LIMIT: u64 = 256 * 1024 * 1024;

pub(super) fn cached(path: &Path) -> Result<bool> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => Ok(metadata.is_file()
            && metadata.len() != 0
            && metadata.permissions().mode() & 0o111 != 0),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(false),
        Err(error) => Err(error.into()),
    }
}

pub(super) fn unpack(archive: &Path, destination: &Path) -> Result<()> {
    let parent = destination.parent().ok_or(Error::ReleaseInvalid)?;
    private_directory(parent)?;
    let mut archive = Archive::new(GzDecoder::new(File::open(archive)?));
    let Ok(mut entries) = archive.entries() else {
        return Err(Error::ReleaseInvalid);
    };
    let Some(Ok(entry)) = entries.next() else {
        return Err(Error::ReleaseInvalid);
    };
    if !entry.header().entry_type().is_file() || entry.path_bytes().as_ref() != b"conductive" {
        return Err(Error::ReleaseInvalid);
    }
    if !(1..=PROGRAM_LIMIT).contains(&entry.size()) {
        return Err(Error::ReleaseInvalid);
    }
    let mut executable = NamedTempFile::new_in(parent)?;
    let size = entry.size();
    let copied = io::copy(&mut entry.take(size), executable.as_file_mut());
    match copied {
        Ok(copied) if copied == size => {}
        Err(error)
            if matches!(
                error.kind(),
                io::ErrorKind::StorageFull | io::ErrorKind::QuotaExceeded
            ) =>
        {
            return Err(Error::NoSpace);
        }
        _ => return Err(Error::ReleaseInvalid),
    }
    if entries.next().is_some() {
        return Err(Error::ReleaseInvalid);
    }
    executable
        .as_file()
        .set_permissions(Permissions::from_mode(0o755))?;
    executable.as_file().sync_all()?;
    match executable.persist(destination) {
        Ok(_) => Ok(()),
        Err(error) => Err(error.error.into()),
    }
}
