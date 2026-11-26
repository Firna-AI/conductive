//! Memory-backed log files with a lock held across every read or rotation.

use std::fs::{self, File, OpenOptions};
use std::io::{ErrorKind, Read, Write};
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::path::PathBuf;
use std::sync::Arc;

use crate::error::{ErrorResultExt, Result};

use super::rotating::{LogFiles, LogTransaction};

/// Native storage. Use a directory under /run, never a saved disk path.
pub struct RuntimeLogFiles {
    /// Private service runtime root.
    pub root: PathBuf,
}

struct Transaction {
    folder: PathBuf,
    _lock: File,
}

impl LogFiles for RuntimeLogFiles {
    fn open(&self, service: &str) -> Result<Arc<dyn LogTransaction>> {
        let folder = self.root.join("logs").join(service);
        fs::create_dir_all(&folder).internal()?;
        fs::set_permissions(&folder, fs::Permissions::from_mode(0o700)).internal()?;
        let lock = OpenOptions::new()
            .create(true)
            .read(true)
            .write(true)
            .truncate(false)
            .mode(0o600)
            .open(folder.join("lock"))
            .internal()?;
        lock.lock().internal()?;
        Ok(Arc::new(Transaction {
            folder,
            _lock: lock,
        }))
    }
}

impl LogTransaction for Transaction {
    fn current_len(&self) -> Result<u64> {
        match fs::metadata(self.folder.join("current")) {
            Ok(value) => Ok(value.len()),
            Err(error) if error.kind() == ErrorKind::NotFound => Ok(0),
            result => {
                result.internal()?;
                Ok(0)
            }
        }
    }

    fn rotate(&self) -> Result<()> {
        let previous = self.folder.join("previous");
        if previous.try_exists().internal()? {
            let _marker = OpenOptions::new()
                .create(true)
                .write(true)
                .truncate(false)
                .mode(0o600)
                .open(self.folder.join("omitted"))
                .internal()?;
        }
        fs::rename(self.folder.join("current"), previous).internal()?;
        Ok(())
    }

    fn append(&self, bytes: &[u8]) -> Result<()> {
        OpenOptions::new()
            .create(true)
            .append(true)
            .mode(0o600)
            .open(self.folder.join("current"))
            .internal()?
            .write_all(bytes)
            .internal()
    }

    fn read(&self) -> Result<(Vec<u8>, bool)> {
        let mut bytes = vec![];
        for name in ["previous", "current"] {
            match File::open(self.folder.join(name)) {
                Ok(mut file) => {
                    file.read_to_end(&mut bytes).internal()?;
                }
                Err(error) if error.kind() == ErrorKind::NotFound => {}
                result => {
                    result.internal()?;
                }
            }
        }
        Ok((bytes, self.folder.join("omitted").try_exists().internal()?))
    }
}
