//! Schedule assertions use paused time and controlled storage futures.

#![allow(clippy::unwrap_used)]

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use futures_util::future::BoxFuture;
use tokio::sync::watch;
use tracing::instrument::WithSubscriber;
use unimock::{MockFn, Unimock, matching};

use crate::skills::boundary::{OrgSkills, SkillsStorage, SkillsStorageMock};
use crate::skills::error::{Error, Result};

#[path = "warnings.rs"]
mod warnings;

use super::SkillsCopy;
use warnings::Warnings;

#[unimock::unimock(api = UpdatesMock)]
trait Updates: Send + Sync {
    fn next(&self, repository: &str) -> BoxFuture<'static, Result<Option<PathBuf>>>;
}

struct Storage(Unimock);
#[async_trait]
impl SkillsStorage for Storage {
    async fn prepare(&self, repository: Option<&str>) -> Result<Option<PathBuf>> {
        SkillsStorage::prepare(&self.0, repository).await
    }
    async fn update(&self, repository: &str) -> Result<Option<PathBuf>> {
        Updates::next(&self.0, repository).await
    }
    async fn sweep(&self, repository: &str, retained: &[PathBuf]) -> Result<()> {
        SkillsStorage::sweep(&self.0, repository, retained).await
    }
}

#[tokio::test(start_paused = true)]
async fn starts_without_waiting_restores_and_keeps_complete_copies_on_each_failed_check() {
    let (release, held) = watch::channel(false);
    let storage = Arc::new(Storage(Unimock::new((
        SkillsStorageMock::sweep
            .each_call(matching!(_, _))
            .answers(&|_, _, _| Ok(())),
        SkillsStorageMock::prepare
            .some_call(matching!(Some("org/skills")))
            .returns(Ok(Some(PathBuf::from("/old/skills")))),
        UpdatesMock::next.stub(|each| {
            each.call(matching!("org/skills"))
                .answers_arc(Arc::new(move |_, _| {
                    let mut held = held.clone();
                    Box::pin(async move {
                        let _ = held.wait_for(|value| *value).await;
                        Ok(Some(PathBuf::from("/new/skills")))
                    })
                }))
                .once()
                .then()
                .answers(&|_, _| Box::pin(async { Err(Error::Git { code: Some(128) }) }))
                .n_times(2);
        }),
    ))));
    let copy = SkillsCopy::new(Some("org/skills".into()), storage);
    assert!(futures_util::poll!(copy.start()).is_ready());
    assert_eq!(copy.current().map(|lease| lease.path().to_owned()), None);
    tokio::task::yield_now().await;
    assert_eq!(
        copy.current().map(|lease| lease.path().to_owned()),
        Some(PathBuf::from("/old/skills"))
    );
    release.send_replace(true);
    tokio::task::yield_now().await;
    assert_eq!(
        copy.current().map(|lease| lease.path().to_owned()),
        Some(PathBuf::from("/new/skills"))
    );
    tokio::time::advance(Duration::from_secs(299)).await;
    assert_eq!(
        copy.current().map(|lease| lease.path().to_owned()),
        Some(PathBuf::from("/new/skills"))
    );
    tokio::time::advance(Duration::from_secs(1)).await;
    tokio::task::yield_now().await;
    assert_eq!(
        copy.current().map(|lease| lease.path().to_owned()),
        Some(PathBuf::from("/new/skills"))
    );
    tokio::time::advance(Duration::from_secs(300)).await;
    tokio::task::yield_now().await;
    assert_eq!(
        copy.current().map(|lease| lease.path().to_owned()),
        Some(PathBuf::from("/new/skills"))
    );
    copy.close().await;
}

#[tokio::test(start_paused = true)]
async fn every_missing_or_private_repository_failure_warns_and_leaves_no_skills() {
    let storage = Arc::new(Unimock::new((
        SkillsStorageMock::sweep
            .each_call(matching!(_, _))
            .answers(&|_, _, _| Ok(())),
        SkillsStorageMock::prepare
            .some_call(matching!(Some("org/missing")))
            .returns(Ok(None)),
        SkillsStorageMock::update
            .some_call(matching!("org/missing"))
            .answers(&|_, _| Err(Error::Git { code: Some(128) }))
            .n_times(2),
    )));
    let warnings = Warnings::default();
    let mut copy = SkillsCopy::new(Some("org/missing".into()), storage);
    copy.interval = Duration::from_secs(7);
    copy.start().with_subscriber(warnings.clone()).await;
    tokio::task::yield_now().await;
    assert_eq!(copy.current().map(|lease| lease.path().to_owned()), None);
    assert_eq!(*warnings.0.lock().unwrap(), 1);
    tokio::time::advance(Duration::from_secs(7)).await;
    tokio::task::yield_now().await;
    assert_eq!(copy.current().map(|lease| lease.path().to_owned()), None);
    assert_eq!(*warnings.0.lock().unwrap(), 2);
    copy.close().await;
}

#[tokio::test(start_paused = true)]
async fn an_unborn_repository_warns_once_until_it_becomes_populated_and_empty_again() {
    let storage = Arc::new(Unimock::new((
        SkillsStorageMock::prepare
            .some_call(matching!(Some("org/skills")))
            .returns(Ok(None)),
        SkillsStorageMock::sweep
            .each_call(matching!(_, _))
            .answers(&|_, _, _| Ok(())),
        SkillsStorageMock::update.stub(|each| {
            each.call(matching!("org/skills"))
                .answers(&|_, _| Ok(None))
                .n_times(2)
                .then()
                .answers(&|_, _| Ok(Some(PathBuf::from("/complete/skills"))))
                .once()
                .then()
                .answers(&|_, _| Ok(None))
                .n_times(2);
        }),
    )));
    let warnings = Warnings::default();
    let copy = SkillsCopy::new(Some("org/skills".into()), storage);
    copy.start().with_subscriber(warnings.clone()).await;
    tokio::task::yield_now().await;
    assert_eq!(*warnings.0.lock().unwrap(), 1);
    for expected in [1, 1, 2, 2] {
        tokio::time::advance(Duration::from_secs(300)).await;
        tokio::task::yield_now().await;
        assert_eq!(*warnings.0.lock().unwrap(), expected);
    }
    assert_eq!(copy.current().map(|lease| lease.path().to_owned()), None);
    copy.close().await;
}
