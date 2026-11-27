//! Real disk blocks kept in the root-owned Conductive state directory.

use std::fs::{DirBuilder, File, Permissions};
use std::io::{self, ErrorKind};
use std::os::unix::fs::{DirBuilderExt, MetadataExt, PermissionsExt};
use std::path::Path;

use rustix::fs::{AtFlags, FallocateFlags, Mode, OFlags, fallocate, open, openat, unlinkat};
use rustix::io::Errno;

use super::{DiskIo, DiskResult, IoContext};

pub(super) const PATH: &str = "/var/lib/conductive/runner-reserve";
const BYTES: u64 = 256 * 1024 * 1024;
const MIN_AVAILABLE_BYTES: u64 = 1024 * 1024 * 1024;

pub(super) fn keep(disk: &dyn DiskIo, held_clusters: u64) -> DiskResult<()> {
    let space = disk
        .space()
        .during("measure space available to the runner")?;
    let available = space
        .free
        .saturating_sub(held_clusters)
        .saturating_mul(space.fragment_bytes);
    if available < MIN_AVAILABLE_BYTES {
        return Ok(());
    }
    disk.allocate_reserve(Path::new(PATH), BYTES)
        .during("allocate the runner disk reserve")
}

pub(super) fn allocate(path: &Path, bytes: u64) -> io::Result<()> {
    let folder = private_folder(path.parent().ok_or(ErrorKind::InvalidInput)?)?;
    let name = path.file_name().ok_or(ErrorKind::InvalidInput)?;
    let file = File::from(openat(
        &folder,
        name,
        OFlags::RDWR | OFlags::CREATE | OFlags::NOFOLLOW | OFlags::NONBLOCK | OFlags::CLOEXEC,
        Mode::RUSR | Mode::WUSR,
    )?);
    let metadata = file.metadata()?;
    if !metadata.is_file() || metadata.uid() != 0 || metadata.nlink() != 1 {
        return Err(ErrorKind::PermissionDenied.into());
    }
    if metadata.len() == bytes && metadata.blocks() >= bytes / 512 {
        return Ok(());
    }
    fallocate(&file, FallocateFlags::empty(), 0, bytes)?;
    file.set_len(bytes)
}

pub(super) fn remove(path: &Path) -> io::Result<()> {
    let folder = match open_folder(path.parent().ok_or(ErrorKind::InvalidInput)?) {
        Ok(folder) => folder,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error),
    };
    let name = path.file_name().ok_or(ErrorKind::InvalidInput)?;
    match unlinkat(&folder, name, AtFlags::empty()) {
        Ok(()) | Err(Errno::NOENT) => Ok(()),
        Err(error) => Err(error.into()),
    }
}

pub(super) fn private_folder(path: &Path) -> io::Result<File> {
    match DirBuilder::new().mode(0o700).create(path) {
        Ok(()) => (),
        Err(error) if error.kind() == ErrorKind::AlreadyExists => (),
        Err(error) => return Err(error),
    }
    let folder = open_folder(path)?;
    if folder.metadata()?.mode() & 0o7777 != 0o700 {
        folder.set_permissions(Permissions::from_mode(0o700))?;
    }
    Ok(folder)
}

fn open_folder(path: &Path) -> io::Result<File> {
    let folder = File::from(open(
        path,
        OFlags::RDONLY | OFlags::DIRECTORY | OFlags::NOFOLLOW | OFlags::CLOEXEC,
        Mode::empty(),
    )?);
    let metadata = folder.metadata()?;
    if metadata.uid() != 0 || metadata.mode() & 0o022 != 0 {
        return Err(ErrorKind::PermissionDenied.into());
    }
    Ok(folder)
}
