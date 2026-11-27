//! Linux filesystem, ext4 sysfs, and saved line operations.

use std::fs::{self, File, Permissions, TryLockError};
use std::io::{self, ErrorKind, Write};
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::path::{Path, PathBuf};

use rustix::fs::statvfs;
use rustix::process::geteuid;
use tempfile::NamedTempFile;

use super::hold::{EXT4, SAVED_LINE, SETTING, Space};
use super::{DiskError, DiskIo, DiskResult, HoldLock, IoContext};

pub(super) struct LinuxDisk;

impl HoldLock for File {}

impl DiskIo for LinuxDisk {
    fn lock(&self) -> DiskResult<Box<dyn HoldLock>> {
        if !geteuid().is_root() {
            return Err(DiskError::RootRequired);
        }
        let operation = "lock the disk hold";
        let file = File::options()
            .write(true)
            .create(true)
            .truncate(false)
            .mode(0o600)
            .open("/run/conductive-disk-hold.lock")
            .during(operation)?;
        match file.try_lock() {
            Ok(()) => Ok(Box::new(file)),
            Err(TryLockError::WouldBlock) => Err(ErrorKind::WouldBlock.into()).during(operation),
            Err(TryLockError::Error(error)) => Err(error).during(operation),
        }
    }

    fn read(&self, path: &Path) -> io::Result<Vec<u8>> {
        fs::read(path)
    }

    fn read_link(&self, path: &Path) -> io::Result<PathBuf> {
        fs::read_link(path)
    }

    fn exists(&self, path: &Path) -> io::Result<bool> {
        path.try_exists()
    }

    fn space(&self) -> io::Result<Space> {
        let stats = statvfs("/")?;
        Ok(Space {
            blocks: stats.f_blocks,
            free: stats.f_bfree,
            fragment_bytes: stats.f_frsize,
        })
    }

    fn save_line(&self, bytes: u64) -> io::Result<()> {
        let folder = "/var/lib/conductive";
        fs::create_dir_all(folder)?;
        let mut file = NamedTempFile::new_in(folder)?;
        writeln!(file, "{bytes}")?;
        file.as_file()
            .set_permissions(Permissions::from_mode(0o644))?;
        file.as_file().sync_all()?;
        file.into_temp_path().persist(SAVED_LINE)?;
        File::open(folder)?.sync_all()
    }

    fn remove_line(&self) -> io::Result<()> {
        match fs::remove_file(SAVED_LINE) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
            Err(error) => Err(error),
        }
    }

    fn settings(&self) -> io::Result<Vec<PathBuf>> {
        let entries = match fs::read_dir(EXT4) {
            Ok(entries) => entries,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
            Err(error) => return Err(error),
        };
        let mut paths = Vec::new();
        for entry in entries {
            let entry = entry?;
            if !entry.file_type()?.is_dir() {
                continue;
            }
            let setting = entry.path().join(SETTING);
            if setting.try_exists()? {
                paths.push(setting);
            }
        }
        Ok(paths)
    }

    fn write_hold(&self, path: &Path, clusters: u64) -> io::Result<()> {
        fs::write(path, format!("{clusters}\n"))
    }
}
