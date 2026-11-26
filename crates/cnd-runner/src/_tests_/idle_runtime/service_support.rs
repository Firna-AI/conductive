//! Unimock native results with a cancellable held log effect.

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use async_trait::async_trait;
use cnd_runner_interface::services::control::{ServiceControlRequest, ServiceControlResult};
use cnd_runner_interface::services::logs::{ServiceLogRequest, ServiceRawLogResponse};
use cnd_runner_interface::services::reports::ServiceReport;
use tokio::sync::Notify;

use crate::error::Result;
use crate::services::ports::ServiceEffects;

pub(super) struct Held {
    pub(super) source: Arc<dyn ServiceEffects>,
    pub(super) entered: Arc<Notify>,
    pub(super) canceled: Arc<AtomicBool>,
}

struct Canceled(Arc<AtomicBool>);
impl Drop for Canceled {
    fn drop(&mut self) {
        self.0.store(true, Ordering::SeqCst);
    }
}

#[async_trait]
impl ServiceEffects for Held {
    async fn snapshot(&self, fresh: bool) -> Result<ServiceReport> {
        self.source.snapshot(fresh).await
    }
    async fn control(&self, request: ServiceControlRequest) -> Result<ServiceControlResult> {
        self.source.control(request).await
    }
    async fn logs(&self, _: ServiceLogRequest) -> Result<ServiceRawLogResponse> {
        let _canceled = Canceled(self.canceled.clone());
        self.entered.notify_one();
        std::future::pending().await
    }
}
