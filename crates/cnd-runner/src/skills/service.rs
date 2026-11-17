//! Nonblocking first copy, restore, five-minute refresh, and shutdown.

use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use tokio::sync::{Mutex, watch};
use tokio::task::JoinHandle;
use tokio::time::{MissedTickBehavior, interval};
use tracing::instrument::WithSubscriber;

use super::boundary::{OrgSkills, SkillsStorage};
use super::error::Result;

/// Skills schedule with a synchronous view of the latest complete folder.
pub struct SkillsCopy {
    storage: Arc<dyn SkillsStorage>,
    repository: Option<String>,
    current: watch::Sender<Option<PathBuf>>,
    stopped: watch::Sender<bool>,
    job: Mutex<Option<JoinHandle<()>>>,
    interval: Duration,
}

impl SkillsCopy {
    /// Compose a public repository selection and its persistent copy boundary.
    pub fn new(repository: Option<String>, storage: Arc<dyn SkillsStorage>) -> Self {
        Self {
            storage,
            repository,
            current: watch::channel(None).0,
            stopped: watch::channel(false).0,
            job: Mutex::new(None),
            interval: Duration::from_secs(5 * 60),
        }
    }
}

#[async_trait]
impl OrgSkills for SkillsCopy {
    async fn start(&self) {
        let mut job = self.job.lock().await;
        if job.is_some() || *self.stopped.borrow() {
            return;
        }
        let storage = self.storage.clone();
        let repository = self.repository.clone();
        let current = self.current.clone();
        let mut stopped = self.stopped.subscribe();
        let mut tick = interval(self.interval);
        tick.set_missed_tick_behavior(MissedTickBehavior::Skip);
        *job = Some(tokio::spawn(async move {
            let mut initialized = false;
            loop {
                tokio::select! {
                    biased;
                    _ = async { let _ = stopped.wait_for(|value| *value).await; } => break,
                    _ = tick.tick() => {},
                }
                let refresh = async {
                    if !initialized {
                        let restored = storage.prepare(repository.as_deref()).await?;
                        current.send_replace(restored);
                        initialized = true;
                    }
                    if let Some(repository) = &repository {
                        current.send_replace(Some(storage.update(repository).await?));
                    }
                    Result::Ok(())
                };
                tokio::select! {
                    biased;
                    _ = async { let _ = stopped.wait_for(|value| *value).await; } => break,
                    result = refresh => {
                        if let Err(error) = result {
                            tracing::warn!(%error, "The skills repository could not update. The runner will continue.");
                        }
                    },
                }
            }
        }.with_current_subscriber()));
    }

    fn current(&self) -> Option<PathBuf> {
        self.current.borrow().clone()
    }

    async fn close(&self) {
        self.stopped.send_replace(true);
        if let Some(job) = self.job.lock().await.take() {
            let _ = job.await;
        }
    }
}

impl Drop for SkillsCopy {
    fn drop(&mut self) {
        self.stopped.send_replace(true);
        if let Some(job) = self.job.get_mut().take() {
            job.abort();
        }
    }
}

#[cfg(test)]
#[path = "_tests_/service_tests.rs"]
mod service_tests;
