//! Filesystem boundary with shared repository containment and dot-file checks.

use std::fs::{File, Metadata};
use std::os::unix::fs::MetadataExt;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use async_trait::async_trait;
use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use bytes::Bytes;
use sha2::{Digest, Sha256};
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

impl FileContent {
    /// Use the version and bytes of the same verified descriptor.
    pub(super) fn from_file(file: File, metadata: &Metadata) -> Result<Self> {
        Ok(Self {
            size: metadata.len(),
            modified: metadata.modified().internal()?,
            etag: FileVersion::from(metadata).etag(),
            reader: Box::new(tokio::fs::File::from_std(file)),
        })
    }
}

/// File identity and times shared by validators and the font cache.
#[derive(Clone, Copy, PartialEq, Eq)]
pub(super) struct FileVersion {
    inode: u64,
    size: u64,
    modified: (i64, i64),
    changed: (i64, i64),
}

impl From<&Metadata> for FileVersion {
    fn from(metadata: &Metadata) -> Self {
        Self {
            inode: metadata.ino(),
            size: metadata.len(),
            modified: (metadata.mtime(), metadata.mtime_nsec()),
            changed: (metadata.ctime(), metadata.ctime_nsec()),
        }
    }
}

impl FileVersion {
    fn etag(self) -> String {
        format!(
            "\"{:x}-{:x}-{:x}-{:x}-{:x}-{:x}\"",
            self.inode, self.size, self.modified.0, self.modified.1, self.changed.0, self.changed.1,
        )
    }
}

/// A safe directory or regular file, without directory listings.
pub enum Entry {
    /// A directory needs an index or a path redirect.
    Directory,
    /// A regular file available for streaming.
    File(FileContent),
}

/// A snapshot of the generated stylesheet and its HTTP validator.
#[derive(Clone)]
pub struct FontStylesheet {
    /// The stylesheet data, shared between requests.
    pub(super) text: Bytes,
    /// A digest of the stylesheet data.
    pub(super) etag: String,
}

impl FontStylesheet {
    /// Pair a stylesheet with its content digest.
    pub(super) fn new(text: String) -> Self {
        let digest = URL_SAFE_NO_PAD.encode(Sha256::digest(text.as_bytes()));
        Self {
            text: Bytes::from(text),
            etag: format!("\"{digest}\""),
        }
    }
}

impl Default for FontStylesheet {
    fn default() -> Self {
        Self::new(String::new())
    }
}

/// File access used by HTTP policy, independent of the physical filesystem.
#[cfg_attr(test, unimock::unimock(api = FilesMock))]
#[async_trait]
pub trait Files: Send + Sync {
    /// Read the current repository folder once for a request.
    fn root(&self) -> PathBuf;

    /// Open a decoded repository-relative path. Empty names the root directory.
    async fn open(&self, root: &Path, path: &str) -> Result<Entry>;

    /// Open a permitted absolute system font path, when font folders are configured.
    async fn open_font(&self, _path: &Path) -> Option<FileContent> {
        None
    }

    /// Get the font stylesheet for the current system font files.
    async fn font_stylesheet(&self) -> FontStylesheet {
        FontStylesheet::default()
    }
}

/// Native files of the runner's current repository folder.
pub struct RepositoryFiles {
    /// The live repository folder. A repository move of the runner sends a
    /// new folder, and each later request reads from it.
    pub root: watch::Receiver<PathBuf>,
}

#[async_trait]
impl Files for RepositoryFiles {
    fn root(&self) -> PathBuf {
        self.root.borrow().clone()
    }

    async fn open(&self, root: &Path, path: &str) -> Result<Entry> {
        let root = root.to_path_buf();
        let path = path.to_owned();
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
            Ok(Entry::File(FileContent::from_file(opened.file, &metadata)?))
        })
        .await
        .internal()?
    }
}
