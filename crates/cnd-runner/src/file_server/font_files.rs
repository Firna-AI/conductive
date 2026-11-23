//! Repository and system font access for the configured preview roots.

use std::fs::{self, File, Metadata};
use std::os::fd::AsRawFd;
use std::path::{Component, Path, PathBuf};
use std::sync::Arc;

use async_trait::async_trait;
use rustix::fs::{Dir, FileType, Mode, OFlags, open};
use tokio::sync::Mutex;

use crate::repository::error::Result;

use super::files::{Entry, FileContent, Files, FontStylesheet};
use super::path::strip_folder;
use super::stylesheet::StylesheetCache;

/// System font folders served by the runner in a sandbox.
pub const SYSTEM_FONT_FOLDERS: [&str; 2] = ["/usr/share/fonts", "/usr/local/share/fonts"];

/// Literal system font folders shared by the direct route and stylesheet.
#[derive(Clone)]
pub(super) struct FontFolders([PathBuf; 2]);

/// The repository and the two system font folders of a files preview.
pub struct PreviewFiles {
    repository: Arc<dyn Files>,
    folders: FontFolders,
    stylesheet: Arc<Mutex<StylesheetCache>>,
}

impl PreviewFiles {
    /// Set the repository and the literal, absolute system font folders.
    pub fn new(repository: Arc<dyn Files>, folders: [PathBuf; 2]) -> Self {
        Self {
            repository,
            folders: FontFolders(folders),
            stylesheet: Arc::new(Mutex::new(StylesheetCache::default())),
        }
    }
}

#[async_trait]
impl Files for PreviewFiles {
    fn root(&self) -> PathBuf {
        self.repository.root()
    }

    async fn open(&self, root: &Path, path: &str) -> Result<Entry> {
        self.repository.open(root, path).await
    }

    async fn open_font(&self, path: &Path) -> Option<FileContent> {
        if !font_extension(path, &["ttf", "otf", "woff", "woff2"]) || !self.folders.contains(path) {
            return None;
        }
        let path = path.to_path_buf();
        let folders = self.folders.clone();
        tokio::task::spawn_blocking(move || {
            let (file, metadata) = folders.open(&path)?;
            FileContent::from_file(file, &metadata).ok()
        })
        .await
        .ok()?
    }

    async fn font_stylesheet(&self) -> FontStylesheet {
        let folders = self.folders.clone();
        let mut cache = self.stylesheet.clone().lock_owned().await;
        tokio::task::spawn_blocking(move || cache.refresh(&folders))
            .await
            .unwrap_or_default()
    }
}

impl FontFolders {
    fn contains(&self, path: &Path) -> bool {
        self.0.iter().any(|folder| {
            strip_folder(path, folder).is_some_and(|remaining| !remaining.as_os_str().is_empty())
        }) && !path.components().any(|component| {
            matches!(component, Component::Normal(name) if name.as_encoded_bytes().starts_with(b"."))
        })
    }

    /// Open a regular font and compare its descriptor path to the literal folders.
    pub(super) fn open(&self, path: &Path) -> Option<(File, Metadata)> {
        let real = fs::canonicalize(path).ok()?;
        if !self.contains(&real) {
            return None;
        }
        let file = File::from(
            open(
                real,
                OFlags::RDONLY | OFlags::NOFOLLOW | OFlags::NONBLOCK | OFlags::CLOEXEC,
                Mode::empty(),
            )
            .ok()?,
        );
        if !self.contains(&descriptor_path(&file)?) {
            return None;
        }
        let metadata = file.metadata().ok()?;
        metadata.is_file().then_some((file, metadata))
    }

    /// List possible stylesheet fonts without traversing links to directories.
    pub(super) fn faces(&self) -> Vec<PathBuf> {
        let mut pending = self.0.to_vec();
        let mut fonts = Vec::new();
        while let Some(folder) = pending.pop() {
            let Some(entries) = directory_entries(&folder) else {
                continue;
            };
            for entry in entries.flatten() {
                let Ok(name) = entry.file_name().to_str() else {
                    continue;
                };
                if name.starts_with('.') {
                    continue;
                }
                let path = folder.join(name);
                let kind = entry.file_type();
                if kind == FileType::Directory
                    || (kind == FileType::Unknown
                        && fs::symlink_metadata(&path).is_ok_and(|metadata| metadata.is_dir()))
                {
                    pending.push(path);
                } else if matches!(
                    kind,
                    FileType::RegularFile | FileType::Symlink | FileType::Unknown
                ) && font_extension(&path, &["ttf", "otf"])
                {
                    fonts.push(path);
                }
            }
        }
        fonts
    }
}

fn font_extension(path: &Path, extensions: &[&str]) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| {
            extensions
                .iter()
                .any(|allowed| extension.eq_ignore_ascii_case(allowed))
        })
}

fn descriptor_path(file: &dyn AsRawFd) -> Option<PathBuf> {
    fs::canonicalize(format!("/proc/self/fd/{}", file.as_raw_fd())).ok()
}

fn directory_entries(path: &Path) -> Option<Dir> {
    let directory = open(
        path,
        OFlags::RDONLY | OFlags::DIRECTORY | OFlags::NOFOLLOW | OFlags::CLOEXEC,
        Mode::empty(),
    )
    .ok()?;
    if descriptor_path(&directory)? != path {
        return None;
    }
    Dir::new(directory).ok()
}
