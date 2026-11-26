//! Cancellable barriers around mocked native effects, with no host IO.

use std::path::PathBuf;
use std::sync::Arc;

use async_trait::async_trait;
use tokio::sync::Notify;

use crate::error::Result;
use crate::ports::{Logs, Units};
use crate::records::UnitStatus;

#[derive(Default)]
pub(super) struct Gate {
    pub(super) entered: Notify,
    pub(super) release: Notify,
}

pub(super) struct HeldLogs {
    pub(super) inner: Arc<dyn Logs>,
    pub(super) gate: Arc<Gate>,
}

#[async_trait]
impl Logs for HeldLogs {
    async fn append(&self, service: &str, bytes: Vec<u8>) -> Result<()> {
        self.inner.append(service, bytes).await
    }
    async fn read(&self, service: &str) -> Result<(Vec<u8>, bool)> {
        self.gate.entered.notify_one();
        self.gate.release.notified().await;
        self.inner.read(service).await
    }
}

pub(super) struct HeldUnits {
    pub(super) inner: Arc<dyn Units>,
    pub(super) gate: Arc<Gate>,
}

#[async_trait]
impl Units for HeldUnits {
    async fn launch(&self, unit: &str, record: PathBuf) -> Result<()> {
        self.inner.launch(unit, record).await
    }
    async fn inspect(&self, unit: &str) -> Result<UnitStatus> {
        self.inner.inspect(unit).await
    }
    async fn stop(&self, unit: &str) -> Result<()> {
        self.gate.entered.notify_one();
        self.gate.release.notified().await;
        self.inner.stop(unit).await
    }
}
