//! One serial job owns updates and sweeps so staging cannot race reclamation.

use std::path::PathBuf;
use std::sync::{Arc, Weak};

use tokio::sync::{Notify, watch};
use tokio::time::Interval;

use super::boundary::SkillsStorage;
use super::lease::{SkillsLease, Snapshot};

pub(super) struct Schedule {
    pub(super) storage: Arc<dyn SkillsStorage>,
    pub(super) repository: Option<String>,
    pub(super) current: watch::Sender<Option<SkillsLease>>,
    pub(super) released: Arc<Notify>,
    pub(super) stopped: watch::Receiver<bool>,
    pub(super) tick: Interval,
}

impl Schedule {
    pub(super) async fn run(mut self) {
        let mut initialized = false;
        let mut empty = false;
        let mut leases = vec![];
        let mut stopped = self.stopped.clone();
        loop {
            let check = tokio::select! {
                biased;
                _ = async { let _ = stopped.wait_for(|value| *value).await; } => break,
                _ = self.tick.tick() => true,
                _ = self.released.notified(), if initialized => false,
            };
            let work = async {
                if !initialized {
                    match self.storage.prepare(self.repository.as_deref()).await {
                        Ok(restored) => {
                            self.publish(restored, &mut leases);
                            initialized = true;
                        }
                        Err(error) => {
                            tracing::warn!(%error, "The skills repository could not prepare. The runner will continue.");
                            return;
                        }
                    }
                }
                let Some(repository) = &self.repository else {
                    return;
                };
                if check {
                    match self.storage.update(repository).await {
                        Ok(copy) => {
                            if copy.is_none() && !empty {
                                tracing::warn!(
                                    "The skills repository has no commits. No org skills will load."
                                );
                            }
                            empty = copy.is_none();
                            self.publish(copy, &mut leases);
                        }
                        Err(error) => {
                            empty = false;
                            tracing::warn!(%error, "The skills repository could not update. The runner will continue.");
                        }
                    }
                }
                let mut retained = vec![];
                leases.retain(|lease| {
                    if let Some(snapshot) = lease.upgrade() {
                        retained.push(snapshot.path.clone());
                        true
                    } else {
                        false
                    }
                });
                if let Err(error) = self.storage.sweep(repository, &retained).await {
                    tracing::warn!(%error, "The skills repository could not reclaim retired copies. The runner will continue.");
                }
            };
            tokio::select! {
                biased;
                _ = async { let _ = stopped.wait_for(|value| *value).await; } => break,
                _ = work => {},
            }
        }
    }

    fn publish(&self, folder: Option<PathBuf>, leases: &mut Vec<Weak<Snapshot>>) {
        if self.current.borrow().as_ref().map(SkillsLease::path) == folder.as_deref() {
            return;
        }
        let lease = folder.map(|folder| SkillsLease::new(folder, self.released.clone()));
        if let Some(lease) = &lease {
            leases.push(lease.weak());
        }
        self.current.send_replace(lease);
    }
}
