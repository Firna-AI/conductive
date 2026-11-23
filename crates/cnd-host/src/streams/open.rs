//! Connection reservations, deadlines, and activation-gated stream tasks.

use std::collections::BTreeMap;
use std::sync::atomic::AtomicUsize;
use std::sync::{Arc, Weak};
use std::time::Duration;

use cnd_runner_interface::host::limits::{HOST_MAX_OPEN_STREAMS, HOST_STREAM_WINDOW_BYTES};
use cnd_runner_interface::host::literals::HostStreamPort;
use cnd_runner_interface::host::messages::HostToWorker;
use cnd_runner_interface::host::results::{HostErrorCode, HostResult};
use tokio::sync::{Mutex, mpsc, oneshot, watch};

use crate::error::Result;

use super::group::{Entry, StreamGroup};
use super::relay::{Relay, StreamRelay};

impl StreamGroup {
    pub(super) async fn connect_stream(&self, id: u32, port: HostStreamPort) -> Result<HostResult> {
        let allowance = Arc::new(AtomicUsize::new(HOST_STREAM_WINDOW_BYTES));
        {
            let mut entries = self.entries.lock().await;
            if entries.contains_key(&id) {
                return Ok(HostResult::Error {
                    code: HostErrorCode::InvalidRequest,
                });
            }
            if entries.len() >= HOST_MAX_OPEN_STREAMS {
                return Ok(HostResult::Error {
                    code: HostErrorCode::Busy,
                });
            }
            entries.insert(
                id,
                Entry {
                    allowance: allowance.clone(),
                    sender: None,
                    credits: None,
                    cancel: None,
                    activate: None,
                    task: None,
                },
            );
        }
        let connected = tokio::select! {
            connected = self.network.connect(port) => connected,
            _ = self.clock.wait(Duration::from_secs(10)) => { self.cancel_reservation(id, &allowance).await; return Ok(HostResult::Error { code: HostErrorCode::PortUnavailable }); }
        };
        let local = match connected {
            Ok(local) => local,
            Err(_) => {
                self.cancel_reservation(id, &allowance).await;
                return Ok(HostResult::Error {
                    code: HostErrorCode::PortUnavailable,
                });
            }
        };
        let mut entries = self.entries.lock().await;
        let Some(entry) = entries
            .get_mut(&id)
            .filter(|entry| Arc::ptr_eq(&entry.allowance, &allowance))
        else {
            return Ok(HostResult::Error {
                code: HostErrorCode::InvalidRequest,
            });
        };
        let (sender, incoming) = mpsc::unbounded_channel();
        let (credits, granted) = mpsc::unbounded_channel();
        let (cancel, mut cancelled) = watch::channel(false);
        let (activate, started) = oneshot::channel();
        let relay: Box<dyn Relay> = Box::new(StreamRelay {
            id,
            local,
            socket: self.socket.clone(),
            incoming,
            credits: granted,
            allowance: allowance.clone(),
        });
        let weak: Weak<Mutex<BTreeMap<u32, Entry>>> = Arc::downgrade(&self.entries);
        let socket = self.socket.clone();
        let task = tokio::spawn(async move {
            let waiting = !*cancelled.borrow();
            let activated = waiting
                && tokio::select! {
                    biased;
                    _ = cancelled.changed() => false,
                    started = started => started.is_ok(),
                };
            if activated && relay.run(cancelled.clone()).await.is_err() && !*cancelled.borrow() {
                let close = HostToWorker::StreamClose { stream_id: id };
                tokio::select! {
                    _ = cancelled.changed() => {},
                    _ = socket.send(&close) => {},
                }
            }
            if let Some(entries) = weak.upgrade() {
                let mut entries = entries.lock().await;
                if entries
                    .get(&id)
                    .is_some_and(|entry| Arc::ptr_eq(&entry.allowance, &allowance))
                {
                    entries.remove(&id);
                }
            }
        });
        entry.sender = Some(sender);
        entry.credits = Some(credits);
        entry.cancel = Some(cancel);
        entry.activate = Some(activate);
        entry.task = Some(task);
        Ok(HostResult::StreamOpened { stream_id: id })
    }

    async fn cancel_reservation(&self, id: u32, allowance: &Arc<AtomicUsize>) {
        let mut entries = self.entries.lock().await;
        if entries
            .get(&id)
            .is_some_and(|entry| Arc::ptr_eq(&entry.allowance, allowance))
        {
            entries.remove(&id);
        }
    }
}
