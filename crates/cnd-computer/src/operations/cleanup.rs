//! Keep the container name locked until a cancelled create is removed.

use std::sync::Arc;
use std::time::Duration;

use tokio::sync::OwnedMutexGuard;
use tokio_util::task::TaskTracker;

use crate::diagnostics::Diagnostics;
use crate::engine::ports::Engine;

pub(super) struct Cleanup {
    engine: Arc<dyn Engine>,
    diagnostics: Arc<dyn Diagnostics>,
    tasks: TaskTracker,
}

impl Cleanup {
    pub(super) fn new(engine: Arc<dyn Engine>, diagnostics: Arc<dyn Diagnostics>) -> Self {
        Self {
            engine,
            diagnostics,
            tasks: TaskTracker::new(),
        }
    }

    pub(super) fn created(self: &Arc<Self>, name: String, lock: OwnedMutexGuard<()>) -> Rollback {
        Rollback {
            cleanup: self.clone(),
            target: Some((name, lock)),
        }
    }

    pub(super) async fn drain(&self) {
        self.tasks.close();
        self.tasks.wait().await;
    }

    async fn remove(&self, name: &str) {
        let result = tokio::time::timeout(Duration::from_secs(50), self.engine.remove(name)).await;
        if !matches!(result, Ok(Ok(()))) {
            self.diagnostics.create_cleanup_failed();
        }
    }
}

pub(super) struct Rollback {
    cleanup: Arc<Cleanup>,
    target: Option<(String, OwnedMutexGuard<()>)>,
}

impl Rollback {
    pub(super) fn disarm(&mut self) {
        self.target = None;
    }

    pub(super) async fn remove(&mut self) {
        if let Some((name, _)) = &self.target {
            self.cleanup.remove(name).await;
        }
        self.disarm();
    }
}

impl Drop for Rollback {
    fn drop(&mut self) {
        if let Some((name, lock)) = self.target.take() {
            let cleanup = self.cleanup.clone();
            self.cleanup.tasks.spawn(async move {
                let _lock = lock;
                cleanup.remove(&name).await;
            });
        }
    }
}
