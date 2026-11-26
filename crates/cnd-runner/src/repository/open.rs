//! Descriptor-verified opens shared by file tabs and the HTTP file server.

use std::fs::{self, File, Metadata};
use std::os::fd::AsRawFd;
use std::path::{Path, PathBuf};

use rustix::fs::{Mode, OFlags, open};

use super::access::safe_path;
use super::error::{Error, ErrorResultExt, Result};

pub(crate) struct VerifiedFile {
    pub(crate) file: File,
    pub(crate) target: PathBuf,
    pub(super) metadata: Metadata,
}

fn file_error(error: std::io::Error) -> Error {
    if error.kind() == std::io::ErrorKind::NotFound {
        Error::NotFound
    } else {
        Error::Unavailable
    }
}

pub(super) fn inside(root: &Path, target: &Path) -> bool {
    target
        .strip_prefix(root)
        .is_ok_and(|relative| !relative.components().any(|part| part.as_os_str() == ".git"))
}

fn verified_open(root: &Path, path: &str) -> Result<VerifiedFile> {
    let canonical = match fs::canonicalize(root) {
        Ok(path) => path,
        Err(error) => return Err(file_error(error)),
    };
    let target = match fs::canonicalize(root.join(path)) {
        Ok(path) => path,
        Err(error) => return Err(file_error(error)),
    };
    if !inside(&canonical, &target) {
        return Err(Error::Unavailable);
    }
    let file: File = match open(
        target,
        OFlags::RDONLY | OFlags::NOFOLLOW | OFlags::NONBLOCK | OFlags::CLOEXEC,
        Mode::empty(),
    ) {
        Ok(file) => file.into(),
        Err(error) => return Err(file_error(error.into())),
    };
    let opened = match fs::canonicalize(format!("/proc/self/fd/{}", file.as_raw_fd())) {
        Ok(path) => path,
        Err(error) => return Err(file_error(error)),
    };
    if !inside(&canonical, &opened) {
        return Err(Error::Unavailable);
    }
    let metadata = file.metadata().internal()?;
    Ok(VerifiedFile {
        file,
        target: opened,
        metadata,
    })
}

pub(crate) fn verified_file(root: &Path, path: &str) -> Result<VerifiedFile> {
    safe_path(path)?;
    let opened = verified_open(root, path)?;
    if !opened.metadata.is_file() {
        return Err(Error::Unavailable);
    }
    Ok(opened)
}

pub(crate) fn verified_directory(root: &Path, path: &str) -> Result<()> {
    if !path.is_empty() {
        safe_path(path)?;
    }
    if !verified_open(root, path)?.metadata.is_dir() {
        return Err(Error::Unavailable);
    }
    Ok(())
}
