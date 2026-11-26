//! Native effects supplied without a dependency on the service implementation.

use async_trait::async_trait;
use cnd_runner_interface::services::control::{ServiceControlRequest, ServiceControlResult};
use cnd_runner_interface::services::logs::{ServiceLogRequest, ServiceRawLogResponse};
use cnd_runner_interface::services::reports::ServiceReport;

use crate::error::Result;

/// Native operations shared with the local CLI and MCP manager.
#[cfg_attr(test, unimock::unimock(api = ServiceEffectsMock))]
#[async_trait]
pub trait ServiceEffects: Send + Sync {
    /// Reconcile a full snapshot. A fresh connection advances its saved revision.
    async fn snapshot(&self, fresh_connection: bool) -> Result<ServiceReport>;
    /// Dispatch one exact request without retrying a possibly completed effect.
    async fn control(&self, request: ServiceControlRequest) -> Result<ServiceControlResult>;
    /// Read retained source without storing or excerpting it.
    async fn logs(&self, request: ServiceLogRequest) -> Result<ServiceRawLogResponse>;
}
