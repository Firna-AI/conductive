//! Nonblocking first copy, restore, five-minute refresh, and shutdown.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use tokio::sync::{Mutex, Notify, watch};
use tokio::task::JoinHandle;
use tokio::time::{MissedTickBehavior, interval};
use tracing::instrument::WithSubscriber;

use std::path::PathBuf;

use super::boundary::{OrgSkills, SkillsStorage};
use super::disk::DiskSkills;
use super::git::CleanGit;
use super::lease::SkillsLease;
use super::schedule::Schedule;

/// Skills schedule with a synchronous lease on the latest complete folder.
pub struct SkillsCopy {
    storage: Arc<dyn SkillsStorage>,
    repository: Option<String>,
    current: watch::Sender<Option<SkillsLease>>,
    released: Arc<Notify>,
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
            released: Arc::new(Notify::new()),
            stopped: watch::channel(false).0,
            job: Mutex::new(None),
            interval: Duration::from_secs(5 * 60),
        }
    }

    /// Keep the copies under this agent home, with public Git access only.
    pub fn on_disk(repository: Option<String>, home: PathBuf) -> Self {
        Self::new(
            repository,
            Arc::new(DiskSkills::new(home, Arc::new(CleanGit))),
        )
    }

    /// Follow each new current copy, such as a first copy or a new commit.
    pub fn changes(&self) -> watch::Receiver<Option<SkillsLease>> {
        self.current.subscribe()
    }
}

#[async_trait]
impl OrgSkills for SkillsCopy {
    async fn start(&self) {
        let mut job = self.job.lock().await;
        if job.is_some() || *self.stopped.borrow() {
            return;
        }
        let mut tick = interval(self.interval);
        tick.set_missed_tick_behavior(MissedTickBehavior::Skip);
        let schedule = Schedule {
            storage: self.storage.clone(),
            repository: self.repository.clone(),
            current: self.current.clone(),
            released: self.released.clone(),
            stopped: self.stopped.subscribe(),
            tick,
        };
        *job = Some(tokio::spawn(schedule.run().with_current_subscriber()));
    }

    fn current(&self) -> Option<SkillsLease> {
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

#[cfg(test)]
#[path = "_tests_/lease_tests.rs"]
mod lease_tests;
