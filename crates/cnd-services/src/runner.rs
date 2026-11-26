//! Adapt the shared native manager to runner-owned private service effects.

use std::path::PathBuf;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner::error::{Error, ErrorResultExt, Result};
use cnd_runner::services::ports::ServiceEffects;
use cnd_runner_interface::services::control::{ServiceControlRequest, ServiceControlResult};
use cnd_runner_interface::services::local::{ServiceLocalRequest, ServiceLocalResponse};
use cnd_runner_interface::services::logs::{ServiceLogRequest, ServiceRawLogResponse};
use cnd_runner_interface::services::reports::ServiceReport;

use crate::manager::state::ServiceManager;

/// Per-round display context over the single process-lifetime manager.
pub struct RunnerServices {
    /// The same manager used by the local socket and ordinary port enrichment.
    pub manager: Arc<dyn ServiceManager>,
    /// Display root only. Saved command folders and provenance do not change.
    pub repository: PathBuf,
}

#[async_trait]
impl ServiceEffects for RunnerServices {
    async fn snapshot(&self, fresh_connection: bool) -> Result<ServiceReport> {
        self.manager
            .repository(self.repository.clone())
            .await
            .internal()?;
        if fresh_connection {
            self.manager.fresh_snapshot().await.internal()
        } else {
            self.manager.snapshot().await.internal()
        }
    }

    async fn control(&self, request: ServiceControlRequest) -> Result<ServiceControlResult> {
        match self
            .manager
            .call(ServiceLocalRequest::Control { request })
            .await
            .internal()?
        {
            ServiceLocalResponse::Control { result } => Ok(result),
            _ => Err(Error::internal_message(
                "native control returned another response kind",
            )),
        }
    }

    async fn logs(&self, request: ServiceLogRequest) -> Result<ServiceRawLogResponse> {
        match self
            .manager
            .call(ServiceLocalRequest::Logs { request })
            .await
            .internal()?
        {
            ServiceLocalResponse::Logs { result } => Ok(result),
            _ => Err(Error::internal_message(
                "native log read returned another response kind",
            )),
        }
    }
}
