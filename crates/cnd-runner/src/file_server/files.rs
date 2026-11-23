//! Filesystem boundary with shared repository containment and dot-file checks.

use std::os::unix::fs::MetadataExt;
use std::path::PathBuf;
use std::time::SystemTime;

use async_trait::async_trait;
use tokio::io::{AsyncRead, AsyncSeek};
use tokio::sync::watch;

use crate::repository::error::{Error, ErrorResultExt, Result};
use crate::repository::open::{verified_directory, verified_file};

/// Seekable, asynchronous content of one verified regular file.
pub trait FileReader: AsyncRead + AsyncSeek + Unpin + Send {}
impl<T: AsyncRead + AsyncSeek + Unpin + Send> FileReader for T {}

/// Metadata and content obtained from the same verified descriptor.
pub struct FileContent {
    /// Descriptor size at open.
    pub size: u64,
    /// Descriptor modification time at open.
    pub modified: SystemTime,
    /// Version of the descriptor metadata at open.
    pub etag: String,
    /// Streaming file reader.
    pub reader: Box<dyn FileReader>,
}

/// A safe directory or regular file, without directory listings.
pub enum Entry {
    /// A directory needs an index or a path redirect.
    Directory,
    /// A regular file available for streaming.
    File(FileContent),
}

/// File access used by HTTP policy, independent of the physical filesystem.
#[cfg_attr(test, unimock::unimock(api = FilesMock))]
#[async_trait]
pub trait Files: Send + Sync {
    /// Open a decoded repository-relative path. Empty names the root directory.
    async fn open(&self, path: String) -> Result<Entry>;
}

/// Native files of the runner's current repository folder.
pub struct RepositoryFiles {
    /// The live repository folder. A repository move of the runner sends a
    /// new folder, and each later request reads from it.
    pub root: watch::Receiver<PathBuf>,
}

#[async_trait]
impl Files for RepositoryFiles {
    async fn open(&self, path: String) -> Result<Entry> {
        let root = self.root.borrow().clone();
        tokio::task::spawn_blocking(move || {
            let opened = match verified_file(&root, &path) {
                Ok(opened) => opened,
                Err(_) => {
                    verified_directory(&root, &path)?;
                    return Ok(Entry::Directory);
                }
            };
            if path
                .rsplit('/')
                .next()
                .is_some_and(|name| name.starts_with('.'))
                || opened
                    .target
                    .file_name()
                    .is_some_and(|name| name.as_encoded_bytes().starts_with(b"."))
            {
                return Err(Error::Unavailable);
            }
            let metadata = opened.file.metadata().internal()?;
            Ok(Entry::File(FileContent {
                size: metadata.len(),
                modified: metadata.modified().internal()?,
                etag: format!(
                    "\"{:x}-{:x}-{:x}-{:x}-{:x}-{:x}\"",
                    metadata.ino(),
                    metadata.len(),
                    metadata.mtime(),
                    metadata.mtime_nsec(),
                    metadata.ctime(),
                    metadata.ctime_nsec(),
                ),
                reader: Box::new(tokio::fs::File::from_std(opened.file)),
            }))
        })
        .await
        .internal()?
    }
}
