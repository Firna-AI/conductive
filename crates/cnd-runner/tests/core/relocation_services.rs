//! Held native log effect for the production repository relocation caller.

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use async_trait::async_trait;
use cnd_runner::error::{Error, Result};
use cnd_runner::services::ports::ServiceEffects;
use cnd_runner_interface::services::control::{ServiceControlRequest, ServiceControlResult};
use cnd_runner_interface::services::logs::{ServiceLogRequest, ServiceRawLogResponse};
use cnd_runner_interface::services::reports::ServiceReport;
use tokio::sync::Notify;

#[derive(Default)]
pub(crate) struct HeldServices {
    pub(crate) entered: Notify,
    pub(crate) canceled: Arc<AtomicBool>,
}

struct Cancel(Arc<AtomicBool>);
impl Drop for Cancel {
    fn drop(&mut self) {
        self.0.store(true, Ordering::SeqCst);
    }
}

#[async_trait]
impl ServiceEffects for HeldServices {
    async fn snapshot(&self, _: bool) -> Result<ServiceReport> {
        Ok(ServiceReport {
            boot_id: "boot".into(),
            revision: 1,
            services: Vec::new(),
        })
    }
    async fn control(&self, _: ServiceControlRequest) -> Result<ServiceControlResult> {
        Err(Error::InvalidCommand)
    }
    async fn logs(&self, _: ServiceLogRequest) -> Result<ServiceRawLogResponse> {
        let _cancel = Cancel(self.canceled.clone());
        self.entered.notify_one();
        std::future::pending().await
    }
}
