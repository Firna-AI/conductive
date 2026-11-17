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
    fn next(&self, repository: &str) -> BoxFuture<'static, Result<PathBuf>>;
}

struct Storage(Unimock);
#[async_trait]
impl SkillsStorage for Storage {
    async fn prepare(&self, repository: Option<&str>) -> Result<Option<PathBuf>> {
        SkillsStorage::prepare(&self.0, repository).await
    }
    async fn update(&self, repository: &str) -> Result<PathBuf> {
        Updates::next(&self.0, repository).await
    }
}

#[tokio::test(start_paused = true)]
async fn starts_without_waiting_restores_and_keeps_complete_copies_on_each_failed_check() {
    let (release, held) = watch::channel(false);
    let storage = Arc::new(Storage(Unimock::new((
        SkillsStorageMock::prepare
            .some_call(matching!(Some("org/skills")))
            .returns(Ok(Some(PathBuf::from("/old/skills")))),
        UpdatesMock::next.stub(|each| {
            each.call(matching!("org/skills"))
                .answers_arc(Arc::new(move |_, _| {
                    let mut held = held.clone();
                    Box::pin(async move {
                        let _ = held.wait_for(|value| *value).await;
                        Ok(PathBuf::from("/new/skills"))
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
    assert_eq!(copy.current(), None);
    tokio::task::yield_now().await;
    assert_eq!(copy.current(), Some(PathBuf::from("/old/skills")));
    release.send_replace(true);
    tokio::task::yield_now().await;
    assert_eq!(copy.current(), Some(PathBuf::from("/new/skills")));
    tokio::time::advance(Duration::from_secs(299)).await;
    assert_eq!(copy.current(), Some(PathBuf::from("/new/skills")));
    tokio::time::advance(Duration::from_secs(1)).await;
    tokio::task::yield_now().await;
    assert_eq!(copy.current(), Some(PathBuf::from("/new/skills")));
    tokio::time::advance(Duration::from_secs(300)).await;
    tokio::task::yield_now().await;
    assert_eq!(copy.current(), Some(PathBuf::from("/new/skills")));
    copy.close().await;
}

#[tokio::test(start_paused = true)]
async fn every_missing_or_private_repository_failure_warns_and_leaves_no_skills() {
    let storage = Arc::new(Unimock::new((
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
    assert_eq!(copy.current(), None);
    assert_eq!(*warnings.0.lock().unwrap(), 1);
    tokio::time::advance(Duration::from_secs(7)).await;
    tokio::task::yield_now().await;
    assert_eq!(copy.current(), None);
    assert_eq!(*warnings.0.lock().unwrap(), 2);
    copy.close().await;
}
