//! Protected preview metadata file access without following symlinks.

use std::fs::OpenOptions;
use std::io::{ErrorKind, Read};
use std::os::unix::fs::{MetadataExt, OpenOptionsExt};
use std::path::PathBuf;

use crate::ingress_config::configuration;

/// Read result before metadata trust and JSON validation.
#[derive(Clone, Debug)]
pub enum IngressFile {
    /// The metadata file is absent.
    Missing,
    /// The file could not be opened or read safely.
    Unreadable,
    /// Bounded contents and metadata of the same opened descriptor.
    Contents {
        /// At most 1025 bytes, including one overflow byte.
        bytes: Vec<u8>,
        /// Owner UID of the opened descriptor.
        uid: u32,
        /// Permissions of the opened descriptor.
        mode: u32,
        /// Whether the descriptor identifies a regular file.
        regular: bool,
    },
}

/// Descriptor boundary for the protected preview metadata file.
#[cfg_attr(test, unimock::unimock(api = IngressFilesMock))]
pub trait IngressFiles: Send + Sync {
    /// Read a bounded regular file without following a symlink or blocking on a FIFO.
    fn read(&self) -> IngressFile;
}

/// Native descriptor reader for the shared preview metadata path.
pub struct NativeIngressFiles {
    path: Option<PathBuf>,
}

impl Default for NativeIngressFiles {
    fn default() -> Self {
        Self {
            path: configuration().map(|config| PathBuf::from(&config.path)),
        }
    }
}

impl IngressFiles for NativeIngressFiles {
    fn read(&self) -> IngressFile {
        let Some(path) = &self.path else {
            return IngressFile::Unreadable;
        };
        let file = match OpenOptions::new()
            .read(true)
            .custom_flags(libc::O_NOFOLLOW | libc::O_NONBLOCK)
            .open(path)
        {
            Ok(file) => file,
            Err(error) if error.kind() == ErrorKind::NotFound => return IngressFile::Missing,
            Err(_) => return IngressFile::Unreadable,
        };
        let metadata = match file.metadata() {
            Ok(metadata) => metadata,
            Err(_) => return IngressFile::Unreadable,
        };
        let regular = metadata.is_file();
        let mut bytes = Vec::new();
        if regular && file.take(1025).read_to_end(&mut bytes).is_err() {
            return IngressFile::Unreadable;
        }
        IngressFile::Contents {
            bytes,
            uid: metadata.uid(),
            mode: metadata.mode(),
            regular,
        }
    }
}
