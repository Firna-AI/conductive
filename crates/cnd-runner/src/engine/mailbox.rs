//! Count queued and executing session work until its owner finishes processing it.

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

use tokio::sync::mpsc;

use crate::error::{Error, Result};

use super::types::Work;

#[derive(Default)]
struct Activity {
    active: AtomicBool,
    pending: AtomicUsize,
}

pub(super) struct Pending(Arc<Activity>);

impl Drop for Pending {
    fn drop(&mut self) {
        self.0.pending.fetch_sub(1, Ordering::AcqRel);
    }
}

/// The pending guard covers both the queue and asynchronous command execution.
pub(super) struct Queued {
    pub(super) work: Work,
    pub(super) pending: Pending,
}

#[derive(Clone)]
pub(super) struct Mailbox {
    sender: mpsc::UnboundedSender<Queued>,
    activity: Arc<Activity>,
}

impl Mailbox {
    pub(super) fn channel() -> (Self, mpsc::UnboundedReceiver<Queued>) {
        let (sender, receiver) = mpsc::unbounded_channel();
        (
            Self {
                sender,
                activity: Arc::new(Activity::default()),
            },
            receiver,
        )
    }

    pub(super) fn send(&self, work: Work) -> Result<()> {
        self.activity.pending.fetch_add(1, Ordering::AcqRel);
        self.sender
            .send(Queued {
                work,
                pending: Pending(self.activity.clone()),
            })
            .or(Err(Error::Canceled))
    }

    pub(super) fn active(&self, active: bool) {
        self.activity.active.store(active, Ordering::Release);
    }

    pub(super) fn busy(&self) -> bool {
        self.activity.active.load(Ordering::Acquire)
            || self.activity.pending.load(Ordering::Acquire) != 0
    }
}
