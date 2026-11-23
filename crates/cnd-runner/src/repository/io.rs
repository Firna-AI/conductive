//! Injectable filesystem operations for repository comparisons.

use std::fs::Metadata;
use std::io::Read;
use std::os::unix::fs::MetadataExt;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::SystemTime;

use async_trait::async_trait;
use sha2::{Digest, Sha256};
use tempfile::TempDir;

use super::access::safe_path;
use super::error::{Error, ErrorResultExt, Result};
use super::open::{inside, verified_file};

/// Physical kinds do not follow links in the Git namespace.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PathKind {
    /// No entry, or a child of a non-directory.
    Absent,
    /// A regular file.
    File,
    /// A symbolic link.
    Link,
    /// A directory, possibly a submodule.
    Directory,
    /// A pipe, socket, device, or other unsupported kind.
    Special,
}

/// A private temporary directory whose lifetime covers an index operation.
pub struct IndexDirectory {
    directory: TempDir,
}

impl IndexDirectory {
    /// Root of private temporary index and object storage.
    pub fn path(&self) -> &Path {
        self.directory.path()
    }
}

/// The metadata that identifies a version of an opened file.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FileFingerprint {
    device: u64,
    inode: u64,
    size: u64,
    modified_ns: i128,
    pub(super) changed_ns: i128,
}

impl From<&Metadata> for FileFingerprint {
    fn from(metadata: &Metadata) -> Self {
        let nanoseconds = |seconds, nanos| i128::from(seconds) * 1_000_000_000 + i128::from(nanos);
        Self {
            device: metadata.dev(),
            inode: metadata.ino(),
            size: metadata.len(),
            modified_ns: nanoseconds(metadata.mtime(), metadata.mtime_nsec()),
            changed_ns: nanoseconds(metadata.ctime(), metadata.ctime_nsec()),
        }
    }
}

/// A content identity captured from a file with stable metadata.
#[derive(Debug, Clone)]
pub struct CachedIdentity {
    pub(super) fingerprint: FileFingerprint,
    pub(super) hash: Arc<str>,
}

/// The outcome of checking an opened file for its content identity.
#[derive(Debug)]
pub enum IdentityRead {
    /// The descriptor still matches a prior read.
    Reused(CachedIdentity),
    /// The file bytes supplied a new hash.
    Hashed {
        /// The SHA-256 identity of the bytes read.
        hash: String,
        /// Metadata that stayed stable throughout the read, when available.
        fingerprint: Option<FileFingerprint>,
    },
    /// The file could not be opened or read.
    Unavailable,
}

/// Disk boundary shared by scans, reads, and diffs.
#[cfg_attr(test, unimock::unimock(api = RepositoryIoMock))]
#[async_trait]
pub trait RepositoryIo: Send + Sync {
    /// Wall time for comparing the start of a scan with file change times.
    fn wall_time(&self) -> SystemTime {
        SystemTime::now()
    }
    /// Add the context exclusion once and create context attachment storage.
    async fn prepare_context(&self, root: PathBuf, exclude: PathBuf) -> Result<()>;
    /// Inspect an entry without following its link.
    async fn kind(&self, path: PathBuf) -> Result<PathKind>;
    /// Read through a verified descriptor and enforce the effective cap.
    async fn read(&self, root: PathBuf, path: String, max_bytes: u64) -> Result<Vec<u8>>;
    /// Read link text after checking the real parent.
    async fn link(&self, root: PathBuf, path: String) -> Result<Vec<u8>>;
    /// Reuse a matching identity or stream the readable bytes from the opened file.
    async fn identity(
        &self,
        root: PathBuf,
        path: String,
        cached: Option<CachedIdentity>,
    ) -> Result<IdentityRead>;
    /// Create private storage and copy the real index when it exists.
    async fn temporary_index(&self, index: PathBuf) -> Result<IndexDirectory>;
}

/// Linux filesystem implementation. Descriptor checks prevent parent-swap escapes.
pub struct LocalRepositoryIo;

#[async_trait]
impl RepositoryIo for LocalRepositoryIo {
    async fn prepare_context(&self, root: PathBuf, exclude: PathBuf) -> Result<()> {
        tokio::task::spawn_blocking(move || super::setup::prepare(&root, &exclude))
            .await
            .internal()?
    }

    async fn kind(&self, path: PathBuf) -> Result<PathKind> {
        match tokio::fs::symlink_metadata(path).await {
            Ok(info) => Ok(if info.is_symlink() {
                PathKind::Link
            } else if info.is_dir() {
                PathKind::Directory
            } else if info.is_file() {
                PathKind::File
            } else {
                PathKind::Special
            }),
            Err(error)
                if matches!(
                    error.kind(),
                    std::io::ErrorKind::NotFound | std::io::ErrorKind::NotADirectory
                ) =>
            {
                Ok(PathKind::Absent)
            }
            Err(error) => Err(Error::internal(error)),
        }
    }

    async fn read(&self, root: PathBuf, path: String, max_bytes: u64) -> Result<Vec<u8>> {
        tokio::task::spawn_blocking(move || {
            let file = verified_file(&root, &path)?.file;
            let size = file.metadata().internal()?.len();
            if size > max_bytes {
                return Err(Error::TooLarge {
                    size,
                    limit: max_bytes,
                });
            }
            let mut bytes = Vec::new();
            file.take(size + 1).read_to_end(&mut bytes).internal()?;
            let length = bytes.len() as u64;
            if length > max_bytes {
                return Err(Error::TooLarge {
                    size: length,
                    limit: max_bytes,
                });
            }
            if length > size {
                return Err(Error::Unavailable);
            }
            Ok(bytes)
        })
        .await
        .internal()?
    }

    async fn link(&self, root: PathBuf, path: String) -> Result<Vec<u8>> {
        safe_path(&path)?;
        let root = tokio::fs::canonicalize(root).await.internal()?;
        let target = root.join(&path);
        let parent = target.parent().ok_or(Error::Unavailable)?;
        let parent = tokio::fs::canonicalize(parent).await.internal()?;
        if !inside(&root, &parent) {
            return Err(Error::Unavailable);
        }
        let name = target.file_name().ok_or(Error::Unavailable)?;
        Ok(tokio::fs::read_link(parent.join(name))
            .await
            .internal()?
            .as_os_str()
            .as_encoded_bytes()
            .to_vec())
    }

    async fn identity(
        &self,
        root: PathBuf,
        path: String,
        cached: Option<CachedIdentity>,
    ) -> Result<IdentityRead> {
        tokio::task::spawn_blocking(move || {
            let Ok(opened) = verified_file(&root, &path) else {
                return Ok(IdentityRead::Unavailable);
            };
            let fingerprint = FileFingerprint::from(&opened.metadata);
            if let Some(cached) = cached.filter(|cached| cached.fingerprint == fingerprint) {
                return Ok(IdentityRead::Reused(cached));
            }
            let mut file = opened.file;
            let mut hash = Sha256::new();
            let mut buffer = [0; 65536];
            loop {
                let count = match file.read(&mut buffer) {
                    Ok(count) => count,
                    Err(_) => return Ok(IdentityRead::Unavailable),
                };
                if count == 0 {
                    break;
                }
                hash.update(&buffer[..count]);
            }
            let hash = hash
                .finalize()
                .iter()
                .map(|byte| format!("{byte:02x}"))
                .collect();
            let fingerprint = file
                .metadata()
                .ok()
                .map(|metadata| FileFingerprint::from(&metadata))
                .filter(|after| *after == fingerprint);
            Ok(IdentityRead::Hashed { hash, fingerprint })
        })
        .await
        .internal()?
    }

    async fn temporary_index(&self, index: PathBuf) -> Result<IndexDirectory> {
        let directory = tempfile::Builder::new()
            .prefix("conductive-git-")
            .tempdir()
            .internal()?;
        tokio::fs::create_dir(directory.path().join("objects"))
            .await
            .internal()?;
        match tokio::fs::copy(index, directory.path().join("index")).await {
            Ok(_) => {}
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(Error::internal(error)),
        }
        Ok(IndexDirectory { directory })
    }
}
