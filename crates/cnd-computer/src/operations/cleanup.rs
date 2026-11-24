//! Keep the container locked through cleanup after a failed or cancelled operation.

use std::sync::Arc;
use std::time::Duration;

use tokio::sync::OwnedMutexGuard;
use tokio_util::task::TaskTracker;

use crate::diagnostics::Diagnostics;
use crate::engine::error::{EngineError, EngineResult};
use crate::engine::ports::Engine;

#[derive(Clone, Copy)]
pub(super) enum Restore {
    Remove,
    Stop,
    Unpause,
}

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

    pub(super) fn guard(
        self: &Arc<Self>,
        name: String,
        lock: OwnedMutexGuard<()>,
        action: Restore,
    ) -> Rollback {
        Rollback {
            cleanup: self.clone(),
            target: Some((name, lock)),
            action,
        }
    }

    pub(super) async fn drain(&self) {
        self.tasks.close();
        self.tasks.wait().await;
    }

    async fn restore(&self, name: &str, action: Restore) -> EngineResult<()> {
        let command = async {
            match action {
                Restore::Remove => self.engine.remove(name).await,
                Restore::Stop => self.engine.stop(name).await,
                Restore::Unpause => self.engine.unpause(name).await,
            }
        };
        let result = tokio::time::timeout(Duration::from_secs(50), command)
            .await
            .unwrap_or(Err(EngineError::Failed));
        if result.is_err() {
            match action {
                Restore::Remove => self.diagnostics.create_cleanup_failed(),
                Restore::Stop => self.diagnostics.start_cleanup_failed(),
                Restore::Unpause => self.diagnostics.save_cleanup_failed(),
            }
        }
        result
    }
}

pub(super) struct Rollback {
    cleanup: Arc<Cleanup>,
    target: Option<(String, OwnedMutexGuard<()>)>,
    action: Restore,
}

impl Rollback {
    pub(super) fn disarm(&mut self) {
        self.target = None;
    }

    pub(super) async fn restore(&mut self) -> EngineResult<()> {
        let Some((name, _)) = &self.target else {
            return Ok(());
        };
        let result = self.cleanup.restore(name, self.action).await;
        self.disarm();
        result
    }
}

impl Drop for Rollback {
    fn drop(&mut self) {
        if let Some((name, lock)) = self.target.take() {
            let cleanup = self.cleanup.clone();
            let action = self.action;
            self.cleanup.tasks.spawn(async move {
                let _lock = lock;
                let _ = cleanup.restore(&name, action).await;
            });
        }
    }
}
