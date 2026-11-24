//! Track accepted requests through their reply writes and signal the first welcome.

use std::sync::Arc;

use tokio::sync::{Notify, OwnedRwLockReadGuard, OwnedRwLockWriteGuard, RwLock};

/// Shared request activity for sessions and the program updater.
#[derive(Default)]
pub struct Activity {
    requests: Arc<RwLock<()>>,
    released: Arc<Notify>,
    welcome: Notify,
}

impl Activity {
    pub(crate) async fn request(&self) -> Request {
        let guard = self.requests.clone().read_owned().await;
        Request {
            guard: Some(guard),
            released: self.released.clone(),
        }
    }

    pub(crate) async fn idle(&self) -> OwnedRwLockWriteGuard<()> {
        loop {
            let released = self.released.notified();
            if let Ok(guard) = self.requests.clone().try_write_owned() {
                return guard;
            }
            released.await;
        }
    }

    pub(crate) fn welcomed(&self) {
        self.welcome.notify_one();
    }

    pub(crate) async fn first_welcome(&self) {
        self.welcome.notified().await;
    }
}

pub(crate) struct Request {
    guard: Option<OwnedRwLockReadGuard<()>>,
    released: Arc<Notify>,
}

impl Drop for Request {
    fn drop(&mut self) {
        let _ = self.guard.take();
        self.released.notify_one();
    }
}
