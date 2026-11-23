//! Held content reads prove the scan limit, comparison order, and cancellation drain.

#![allow(clippy::unwrap_used, clippy::expect_used)]

use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;

use async_trait::async_trait;
use cnd_runner::repository::error::{Error, Result};
use cnd_runner::repository::git::{Cancellation, ChildGit, GitRequest, GitRunner};
use cnd_runner::repository::io::{
    CachedIdentity, IdentityRead, IndexDirectory, LocalRepositoryIo, PathKind, RepositoryIo,
};
use cnd_runner::repository::service::{GitRepository, Repository};
use tokio::sync::{mpsc, oneshot};

use super::support::Fixture;

struct Read {
    path: String,
    release: oneshot::Sender<()>,
    finished: oneshot::Receiver<()>,
}

struct HeldIo {
    reads: mpsc::UnboundedSender<Read>,
    active: AtomicUsize,
    peak: AtomicUsize,
    completed: AtomicUsize,
}

#[async_trait]
impl RepositoryIo for HeldIo {
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
        let active = self.active.fetch_add(1, Ordering::SeqCst) + 1;
        self.peak.fetch_max(active, Ordering::SeqCst);
        let (release, held) = oneshot::channel();
        let (finished, completion) = oneshot::channel();
        self.reads
            .send(Read {
                path: path.clone(),
                release,
                finished: completion,
            })
            .unwrap();
        held.await.unwrap();
        let result = LocalRepositoryIo.identity(root, path, cached).await;
        self.active.fetch_sub(1, Ordering::SeqCst);
        self.completed.fetch_add(1, Ordering::SeqCst);
        finished.send(()).unwrap();
        result
    }

    async fn temporary_index(&self, index: PathBuf) -> Result<IndexDirectory> {
        LocalRepositoryIo.temporary_index(index).await
    }
}

struct ObservedGit(Arc<AtomicUsize>);

#[async_trait]
impl GitRunner for ObservedGit {
    async fn run(&self, request: GitRequest) -> Result<Vec<u8>> {
        if request.args.first().is_some_and(|arg| arg == "diff")
            || (request
                .args
                .first()
                .is_some_and(|arg| arg == "update-index")
                && request.args.iter().any(|arg| arg == "--refresh"))
        {
            self.0.fetch_add(1, Ordering::SeqCst);
        }
        ChildGit.run(request).await
    }
}

fn repository(
    fixture: &Fixture,
    cancellation: Cancellation,
) -> (
    Arc<dyn Repository>,
    Arc<HeldIo>,
    Arc<AtomicUsize>,
    mpsc::UnboundedReceiver<Read>,
) {
    for number in 0..32 {
        fixture.write(&format!("file-{number:02}.txt"), b"content\n");
    }
    let (send, reads) = mpsc::unbounded_channel();
    let io = Arc::new(HeldIo {
        reads: send,
        active: AtomicUsize::new(0),
        peak: AtomicUsize::new(0),
        completed: AtomicUsize::new(0),
    });
    let comparisons = Arc::new(AtomicUsize::new(0));
    let repository = Arc::new(GitRepository::new(
        fixture.root.clone(),
        Arc::new(ObservedGit(comparisons.clone())),
        io.clone(),
        cancellation,
    ));
    (repository, io, comparisons, reads)
}

#[tokio::test]
async fn scan_holds_sixteen_reads_and_finishes_them_before_git_comparisons() {
    tokio::time::timeout(Duration::from_secs(30), async {
        let h = Fixture::new().await;
        let (repository, io, comparisons, mut reads) = repository(&h, Cancellation::default());
        let running = tokio::spawn(async move { repository.snapshot("main".into()).await });
        let first = reads.recv().await.unwrap();
        assert_eq!(io.active.load(Ordering::SeqCst), 16);
        assert_eq!(comparisons.load(Ordering::SeqCst), 0);
        let mut held = vec![first];
        for _ in 1..16 {
            held.push(reads.try_recv().unwrap());
        }
        assert!(matches!(
            reads.try_recv(),
            Err(mpsc::error::TryRecvError::Empty)
        ));
        let last = held.pop().unwrap();
        last.release.send(()).unwrap();
        last.finished.await.unwrap();
        held.push(reads.recv().await.unwrap());
        assert_eq!(io.active.load(Ordering::SeqCst), 16);
        assert_eq!(io.completed.load(Ordering::SeqCst), 1);
        assert_eq!(comparisons.load(Ordering::SeqCst), 0);
        let mut paths = vec![last.path];
        let mut completions = Vec::new();
        for read in held {
            paths.push(read.path);
            read.release.send(()).unwrap();
            completions.push(read.finished);
        }
        for _ in 17..36 {
            let read = reads.recv().await.unwrap();
            paths.push(read.path);
            read.release.send(()).unwrap();
            completions.push(read.finished);
        }
        for finished in completions {
            finished.await.unwrap();
        }
        let snapshot = running.await.unwrap().unwrap();
        paths.sort();
        assert_eq!(
            snapshot.read_identities.into_keys().collect::<Vec<_>>(),
            paths
        );
        assert_eq!(io.active.load(Ordering::SeqCst), 0);
        assert_eq!(io.completed.load(Ordering::SeqCst), 36);
        assert_eq!(io.peak.load(Ordering::SeqCst), 16);
        assert_eq!(comparisons.load(Ordering::SeqCst), 3);
    })
    .await
    .expect("held scan hang guard");
}

#[tokio::test]
async fn canceled_scan_finishes_started_reads_without_starting_more() {
    tokio::time::timeout(Duration::from_secs(30), async {
        let h = Fixture::new().await;
        let cancellation = Cancellation::default();
        let (repository, io, comparisons, mut reads) = repository(&h, cancellation.clone());
        let running = tokio::spawn(async move { repository.snapshot("main".into()).await });
        let first = reads.recv().await.unwrap();
        assert_eq!(io.active.load(Ordering::SeqCst), 16);
        let mut held = Vec::new();
        for _ in 1..16 {
            held.push(reads.try_recv().unwrap());
        }
        cancellation.cancel();
        first.release.send(()).unwrap();
        first.finished.await.unwrap();
        assert!(!running.is_finished());
        for read in held {
            read.release.send(()).unwrap();
            read.finished.await.unwrap();
        }
        assert!(matches!(running.await.unwrap(), Err(Error::Canceled)));
        assert_eq!(io.completed.load(Ordering::SeqCst), 16);
        assert_eq!(io.active.load(Ordering::SeqCst), 0);
        assert_eq!(io.peak.load(Ordering::SeqCst), 16);
        assert_eq!(comparisons.load(Ordering::SeqCst), 0);
        assert!(matches!(
            reads.try_recv(),
            Err(mpsc::error::TryRecvError::Empty)
        ));
    })
    .await
    .expect("canceled scan hang guard");
}
