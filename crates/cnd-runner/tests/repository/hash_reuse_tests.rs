//! Snapshot identity reuse with real descriptors and explicit scan timestamps.

#![allow(clippy::unwrap_used)]

use std::fs::{self, File};
use std::os::unix::fs::{MetadataExt, symlink};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use async_trait::async_trait;
use cnd_runner::repository::error::Result;
use cnd_runner::repository::git::{Cancellation, ChildGit};
use cnd_runner::repository::io::{
    CachedIdentity, IdentityRead, IndexDirectory, LocalRepositoryIo, PathKind, RepositoryIo,
};
use cnd_runner::repository::service::{GitRepository, Repository};

use super::support::Fixture;

const PATH: &str = ".context/hash.txt";
const ORIGINAL: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const REPLACEMENT: &str = "3608bca1e44ea6c4d268eb6db02260269892c0b42b86bbf1e77a6fa16c3c9282";
const REUSE_AGE: Duration = Duration::from_secs(2);

#[derive(Debug, PartialEq, Eq)]
enum ReadKind {
    Reused,
    Hashed,
    Unavailable,
}

struct ObservedIo {
    scan_start: Mutex<SystemTime>,
    reads: Mutex<Vec<(bool, ReadKind)>>,
}

#[async_trait]
impl RepositoryIo for ObservedIo {
    fn wall_time(&self) -> SystemTime {
        *self.scan_start.lock().unwrap()
    }

    async fn prepare_context(&self, root: PathBuf, exclude: PathBuf) -> Result<()> {
        LocalRepositoryIo.prepare_context(root, exclude).await
    }

    async fn kind(&self, path: PathBuf) -> Result<PathKind> {
        LocalRepositoryIo.kind(path).await
    }

    async fn read(&self, root: PathBuf, path: String, max_bytes: u64) -> Result<Vec<u8>> {
        LocalRepositoryIo.read(root, path, max_bytes).await
    }

    async fn link(&self, root: PathBuf, path: String) -> Result<Vec<u8>> {
        LocalRepositoryIo.link(root, path).await
    }

    async fn identity(
        &self,
        root: PathBuf,
        path: String,
        cached: Option<CachedIdentity>,
    ) -> Result<IdentityRead> {
        let watching = path == PATH;
        let had_cached = cached.is_some();
        let read = LocalRepositoryIo.identity(root, path, cached).await?;
        if watching {
            let kind = match &read {
                IdentityRead::Reused(_) => ReadKind::Reused,
                IdentityRead::Hashed { .. } => ReadKind::Hashed,
                IdentityRead::Unavailable => ReadKind::Unavailable,
            };
            self.reads.lock().unwrap().push((had_cached, kind));
        }
        Ok(read)
    }

    async fn temporary_index(&self, index: PathBuf) -> Result<IndexDirectory> {
        LocalRepositoryIo.temporary_index(index).await
    }
}

struct CacheFixture {
    git: Fixture,
    repository: GitRepository,
    io: Arc<ObservedIo>,
}

impl CacheFixture {
    async fn new() -> Self {
        let git = Fixture::new().await;
        git.repository.prepare_context().await.unwrap();
        git.write(PATH, b"abc");
        let io = Arc::new(ObservedIo {
            scan_start: Mutex::new(UNIX_EPOCH),
            reads: Mutex::new(vec![]),
        });
        let repository = GitRepository::new(
            git.root.clone(),
            Arc::new(ChildGit),
            io.clone(),
            Cancellation::default(),
        );
        Self {
            git,
            repository,
            io,
        }
    }

    fn set_age_at_scan_start(&self, age: Duration) {
        let metadata = fs::metadata(self.git.root.join(PATH)).unwrap();
        let changed = Duration::new(
            metadata.ctime().try_into().unwrap(),
            metadata.ctime_nsec().try_into().unwrap(),
        );
        *self.io.scan_start.lock().unwrap() = UNIX_EPOCH + changed + age;
    }

    async fn scan(&self, expected_hash: Option<&str>, expected_read: Option<(bool, ReadKind)>) {
        let snapshot = self.repository.snapshot("main".into()).await.unwrap();
        let reads = std::mem::take(&mut *self.io.reads.lock().unwrap());
        assert_eq!(
            snapshot.read_identities.get(PATH).map(String::as_str),
            expected_hash
        );
        assert_eq!(reads, expected_read.into_iter().collect::<Vec<_>>());
    }
}

#[tokio::test]
async fn unchanged_file_reuses_hash_at_two_second_boundary() {
    let h = CacheFixture::new().await;
    h.set_age_at_scan_start(REUSE_AGE);
    h.scan(Some(ORIGINAL), Some((false, ReadKind::Hashed)))
        .await;
    h.scan(Some(ORIGINAL), Some((true, ReadKind::Reused))).await;
}

#[tokio::test]
async fn replaced_file_with_same_size_and_mtime_is_hashed_again() {
    let h = CacheFixture::new().await;
    h.set_age_at_scan_start(REUSE_AGE);
    h.scan(Some(ORIGINAL), Some((false, ReadKind::Hashed)))
        .await;

    let path = h.git.root.join(PATH);
    let modified = fs::metadata(&path).unwrap().modified().unwrap();
    fs::rename(&path, h.git.root.parent().unwrap().join("original")).unwrap();
    h.git.write(PATH, b"xyz");
    File::open(path).unwrap().set_modified(modified).unwrap();

    h.scan(Some(REPLACEMENT), Some((true, ReadKind::Hashed)))
        .await;
}

#[tokio::test]
async fn change_inside_previous_scan_window_is_hashed_again() {
    let h = CacheFixture::new().await;
    File::open(h.git.root.join(PATH))
        .unwrap()
        .set_modified(UNIX_EPOCH)
        .unwrap();
    h.set_age_at_scan_start(REUSE_AGE - Duration::from_nanos(1));
    h.scan(Some(ORIGINAL), Some((false, ReadKind::Hashed)))
        .await;

    h.set_age_at_scan_start(REUSE_AGE);
    h.scan(Some(ORIGINAL), Some((false, ReadKind::Hashed)))
        .await;
    h.scan(Some(ORIGINAL), Some((true, ReadKind::Reused))).await;
}

#[tokio::test]
async fn missing_file_loses_cached_hash_before_it_returns() {
    let h = CacheFixture::new().await;
    h.set_age_at_scan_start(REUSE_AGE);
    h.scan(Some(ORIGINAL), Some((false, ReadKind::Hashed)))
        .await;
    h.scan(Some(ORIGINAL), Some((true, ReadKind::Reused))).await;

    fs::remove_file(h.git.root.join(PATH)).unwrap();
    h.scan(None, None).await;
    h.git.write(PATH, b"xyz");
    h.scan(Some(REPLACEMENT), Some((false, ReadKind::Hashed)))
        .await;
}

#[tokio::test]
async fn unavailable_file_keeps_its_report_identity_and_drops_its_cached_hash() {
    let h = CacheFixture::new().await;
    h.set_age_at_scan_start(REUSE_AGE);
    h.scan(Some(ORIGINAL), Some((false, ReadKind::Hashed)))
        .await;

    let path = h.git.root.join(PATH);
    let outside = h.git.root.parent().unwrap().join("outside");
    fs::rename(&path, &outside).unwrap();
    symlink(outside, path).unwrap();

    h.scan(Some("unavailable"), Some((true, ReadKind::Unavailable)))
        .await;
    h.scan(Some("unavailable"), Some((false, ReadKind::Unavailable)))
        .await;
}
