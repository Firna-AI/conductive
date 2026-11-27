//! Allocate and reclaim only the runner's own reserve file.

use std::fs::{self, File, Metadata};
use std::io::{self, ErrorKind};
use std::os::unix::fs::MetadataExt;
use std::path::Path;

use rustix::fs::{FallocateFlags, Mode, OFlags, XattrFlags, fallocate, fgetxattr, fsetxattr, open};
use rustix::io::Errno;
use tempfile::NamedTempFile;

use crate::disk::RESERVE_BYTES;

const OWNER_ATTRIBUTE: &str = "user.conductive.disk-reserve";

pub(super) fn ready(path: &Path) -> io::Result<bool> {
    Ok(
        open_owned(path, OFlags::RDONLY)?.is_some_and(|(_, metadata)| {
            metadata.len() == RESERVE_BYTES && metadata.blocks() >= RESERVE_BYTES / 512
        }),
    )
}

pub(super) fn remove(path: &Path) -> io::Result<()> {
    let Some((_file, metadata)) = open_owned(path, OFlags::RDONLY)? else {
        return Ok(());
    };
    if let Some(current) = path_metadata(path)? {
        if !same_file(&metadata, &current) {
            return Err(ErrorKind::AlreadyExists.into());
        }
        match fs::remove_file(path) {
            Err(error) if error.kind() == ErrorKind::NotFound => (),
            result => result?,
        }
    }
    Ok(())
}

pub(super) fn allocate(path: &Path, bytes: u64) -> io::Result<()> {
    if let Some((file, _)) = open_owned(path, OFlags::RDWR)? {
        fallocate(&file, FallocateFlags::empty(), 0, bytes)?;
        return file.set_len(bytes);
    }

    let folder = path.parent().ok_or(ErrorKind::InvalidInput)?;
    let temporary = NamedTempFile::new_in(folder)?;
    let file = temporary.as_file();
    fsetxattr(
        file,
        OWNER_ATTRIBUTE,
        &file.metadata()?.ino().to_le_bytes(),
        XattrFlags::CREATE,
    )?;
    fallocate(file, FallocateFlags::empty(), 0, bytes)?;
    temporary.persist_noclobber(path)?;
    Ok(())
}

fn open_owned(path: &Path, access: OFlags) -> io::Result<Option<(File, Metadata)>> {
    let Some(expected) = path_metadata(path)? else {
        return Ok(None);
    };
    if !expected.is_file() {
        return Err(ErrorKind::AlreadyExists.into());
    }
    let file = match open(
        path,
        access | OFlags::NOFOLLOW | OFlags::NONBLOCK | OFlags::CLOEXEC,
        Mode::empty(),
    ) {
        Ok(fd) => File::from(fd),
        Err(Errno::NOENT) => return Ok(None),
        Err(Errno::LOOP | Errno::ISDIR | Errno::ACCESS | Errno::PERM) => {
            return Err(ErrorKind::AlreadyExists.into());
        }
        Err(error) => return Err(error.into()),
    };
    let metadata = file.metadata()?;
    if !same_file(&expected, &metadata) {
        return Err(ErrorKind::AlreadyExists.into());
    }
    let expected_marker = metadata.ino().to_le_bytes();
    let mut marker = [0; 8];
    match fgetxattr(&file, OWNER_ATTRIBUTE, &mut marker[..]) {
        Ok(length) if length == marker.len() && marker == expected_marker => {
            Ok(Some((file, metadata)))
        }
        Ok(_) | Err(Errno::NODATA | Errno::NOTSUP | Errno::RANGE) => {
            Err(ErrorKind::AlreadyExists.into())
        }
        Err(error) => Err(error.into()),
    }
}

fn path_metadata(path: &Path) -> io::Result<Option<Metadata>> {
    match fs::symlink_metadata(path) {
        Ok(metadata) => Ok(Some(metadata)),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error),
    }
}

fn same_file(left: &Metadata, right: &Metadata) -> bool {
    left.dev() == right.dev() && left.ino() == right.ino()
}
