//! Root commands that set or release the ext4 disk hold.

use std::env;
use std::io;
use std::path::{Path, PathBuf};

use clap::{Args, Subcommand};
use cnd_runner::config::DISK_LINE_ENV;
use thiserror::Error;

use crate::error::{Error, Result};

use self::hold::Space;
use self::linux::LinuxDisk;

mod hold;
mod linux;
mod settings;

/// Options for the disk hold command.
#[derive(Debug, Args)]
pub(crate) struct DiskArgs {
    #[command(subcommand)]
    operation: Operation,
}

#[derive(Debug, Subcommand)]
enum Operation {
    /// Apply the configured hold to the root filesystem.
    Hold,
    /// Restore the default hold on every ext4 filesystem.
    Release,
}

/// Report any failure as one line at the command boundary.
pub(crate) fn execute(args: DiskArgs) -> Result<()> {
    match run(args.operation) {
        Ok(()) => Ok(()),
        Err(error) => Err(Error::Disk(error)),
    }
}

fn run(operation: Operation) -> DiskResult<()> {
    let disk = LinuxDisk;
    match operation {
        Operation::Hold => {
            let value = env::var_os(DISK_LINE_ENV);
            if let Some(line) = settings::configured_line(&disk, value.as_deref())? {
                hold::apply(&disk, line)?;
            }
            Ok(())
        }
        Operation::Release => hold::release(&disk),
    }
}

trait HoldLock: Send + Sync {}

#[cfg_attr(
    test,
    unimock::unimock(api = [
        MockLock, MockRead, MockReadLink, MockExists, MockSpace, MockSaveLine, MockRemoveLine,
        MockSettings, MockWriteHold
    ])
)]
trait DiskIo {
    fn lock(&self) -> DiskResult<Box<dyn HoldLock>>;
    fn read(&self, path: &Path) -> io::Result<Vec<u8>>;
    fn read_link(&self, path: &Path) -> io::Result<PathBuf>;
    fn exists(&self, path: &Path) -> io::Result<bool>;
    fn space(&self) -> io::Result<Space>;
    fn save_line(&self, bytes: u64) -> io::Result<()>;
    fn remove_line(&self) -> io::Result<()>;
    fn settings(&self) -> io::Result<Vec<PathBuf>>;
    fn write_hold(&self, path: &Path, clusters: u64) -> io::Result<()>;
}

/// A disk command failure, with a diagnostic that contains no environment values.
#[derive(Debug, Error)]
pub(crate) enum DiskError {
    #[error("[cnd-cli/disk] changing the disk hold requires root")]
    RootRequired,
    #[error("[cnd-cli/disk] expected a decimal byte count in {location}")]
    InvalidLine { location: &'static str },
    #[error("[cnd-cli/disk] could not identify the root filesystem in mount information")]
    InvalidMount,
    #[error("[cnd-cli/disk] invalid root filesystem size or free space")]
    InvalidSpace,
    #[error("[cnd-cli/disk] could not {operation}: {source}")]
    Io {
        operation: &'static str,
        #[source]
        source: io::Error,
    },
}

type DiskResult<T> = std::result::Result<T, DiskError>;

trait IoContext<T> {
    fn during(self, operation: &'static str) -> DiskResult<T>;
}

impl<T> IoContext<T> for io::Result<T> {
    fn during(self, operation: &'static str) -> DiskResult<T> {
        match self {
            Ok(value) => Ok(value),
            Err(source) => Err(DiskError::Io { operation, source }),
        }
    }
}

fn read_optional(disk: &dyn DiskIo, path: &Path) -> io::Result<Option<Vec<u8>>> {
    match disk.read(path) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error),
    }
}

#[cfg(test)]
#[path = "_tests_/disk_command_tests.rs"]
mod disk_command_tests;
