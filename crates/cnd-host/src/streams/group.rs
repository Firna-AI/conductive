//! Bounded per-connection stream reservations and task lifetime.

use std::collections::BTreeMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

use async_trait::async_trait;
use cnd_runner_interface::host::literals::HostStreamPort;
use cnd_runner_interface::host::messages::HostToWorker;
use cnd_runner_interface::host::results::HostResult;
use tokio::sync::{Mutex, mpsc, oneshot, watch};
use tokio::task::JoinHandle;

use crate::error::Result;
use crate::ports::{Clock, Socket};

use super::ports::{Network, StreamFactory, Streams};
use super::relay::Input;

pub(super) struct Entry {
    pub(super) allowance: Arc<AtomicUsize>,
    pub(super) sender: Option<mpsc::UnboundedSender<Input>>,
    pub(super) credits: Option<mpsc::UnboundedSender<u32>>,
    pub(super) cancel: Option<watch::Sender<bool>>,
    pub(super) activate: Option<oneshot::Sender<()>>,
    pub(super) task: Option<JoinHandle<()>>,
}

/// Factory that shares only the clock and fixed-port connector across sessions.
pub struct StreamGroups {
    /// Native or mocked local network.
    pub network: Arc<dyn Network>,
    /// Connect deadline boundary.
    pub clock: Arc<dyn Clock>,
}

impl StreamFactory for StreamGroups {
    fn create(&self, socket: Arc<dyn Socket>) -> Arc<dyn Streams> {
        Arc::new(StreamGroup {
            entries: Arc::new(Mutex::new(BTreeMap::new())),
            socket,
            network: self.network.clone(),
            clock: self.clock.clone(),
        })
    }
}

pub(super) struct StreamGroup {
    pub(super) entries: Arc<Mutex<BTreeMap<u32, Entry>>>,
    pub(super) socket: Arc<dyn Socket>,
    pub(super) network: Arc<dyn Network>,
    pub(super) clock: Arc<dyn Clock>,
}

#[async_trait]
impl Streams for StreamGroup {
    async fn open(&self, id: u32, port: HostStreamPort) -> Result<HostResult> {
        self.connect_stream(id, port).await
    }

    async fn activate(&self, id: u32) {
        if let Some(entry) = self.entries.lock().await.get_mut(&id)
            && let Some(start) = entry.activate.take()
        {
            let _ = start.send(());
        }
    }

    async fn data(&self, id: u32, bytes: Vec<u8>) -> Result<()> {
        let sender = {
            let entries = self.entries.lock().await;
            entries.get(&id).and_then(|entry| {
                if !reserve(&entry.allowance, bytes.len()) {
                    return None;
                }
                entry.sender.clone()
            })
        };
        match sender {
            Some(sender) if sender.send(Input::Data(bytes)).is_ok() => Ok(()),
            _ => {
                self.close(id).await;
                self.socket
                    .send(&HostToWorker::StreamClose { stream_id: id })
                    .await
            }
        }
    }

    async fn credit(&self, id: u32, bytes: u32) -> Result<()> {
        let sender = self
            .entries
            .lock()
            .await
            .get(&id)
            .and_then(|entry| entry.credits.clone());
        if sender.is_some_and(|sender| sender.send(bytes).is_ok()) {
            return Ok(());
        }
        self.close(id).await;
        self.socket
            .send(&HostToWorker::StreamClose { stream_id: id })
            .await
    }

    async fn end(&self, id: u32) -> Result<()> {
        self.control(id, Input::End).await
    }

    async fn close(&self, id: u32) {
        let entry = self.entries.lock().await.remove(&id);
        if let Some(entry) = entry {
            if let Some(cancel) = entry.cancel {
                cancel.send_replace(true);
            }
            if let Some(task) = entry.task {
                let _ = task.await;
            }
        }
    }

    async fn close_all(&self) {
        let entries = std::mem::take(&mut *self.entries.lock().await);
        for entry in entries.into_values() {
            if let Some(cancel) = entry.cancel {
                cancel.send_replace(true);
            }
            if let Some(task) = entry.task {
                let _ = task.await;
            }
        }
    }
}

impl StreamGroup {
    async fn control(&self, id: u32, input: Input) -> Result<()> {
        let sender = self
            .entries
            .lock()
            .await
            .get(&id)
            .and_then(|entry| entry.sender.clone());
        if sender.is_some_and(|sender| sender.send(input).is_ok()) {
            return Ok(());
        }
        self.close(id).await;
        self.socket
            .send(&HostToWorker::StreamClose { stream_id: id })
            .await
    }
}

fn reserve(allowance: &AtomicUsize, size: usize) -> bool {
    let mut current = allowance.load(Ordering::SeqCst);
    loop {
        let Some(next) = current.checked_sub(size) else {
            return false;
        };
        match allowance.compare_exchange_weak(current, next, Ordering::SeqCst, Ordering::SeqCst) {
            Ok(_) => return true,
            Err(actual) => current = actual,
        }
    }
}

#[cfg(test)]
#[path = "_tests_/group_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "_tests_/blocked_write_tests.rs"]
mod blocked_write_tests;
