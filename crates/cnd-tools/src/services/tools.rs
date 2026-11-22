//! Local service tool identities, context effects, and adapter boundary.

use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::services::control::ServiceControlOutcome;
use cnd_runner_interface::services::local::ServiceLocalResponse;
use cnd_runner_interface::services::logs::ServiceRawLogResult;
use cnd_runner_interface::services::process::ServiceState;
use cnd_services::socket::client::LocalClient;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::error::{ErrorResultExt, Result};

/// The five local calls need no Worker credentials or active turn.
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ServiceName {
    /// Start or reuse one exact service name.
    StartService,
    /// List all services of this computer.
    ListServices,
    /// End the named service's complete process tree.
    StopService,
    /// Run the saved definition again, including a nonrunning service.
    RestartService,
    /// Read complete retained output without app excerpt cuts.
    ReadServiceLogs,
}

/// Caller context, never a credential source for the service environment.
#[cfg_attr(test, unimock::unimock(api = LocalContextMock))]
pub trait LocalContext: Send + Sync {
    /// Current folder of a CLI call or the MCP server.
    fn folder(&self) -> Result<String>;
    /// Optional untrusted originating context. It grants no right.
    fn turn_id(&self) -> Option<String>;
}

/// Native caller context is read only to form the local request.
pub struct NativeContext;

impl LocalContext for NativeContext {
    fn folder(&self) -> Result<String> {
        Ok(std::env::current_dir()
            .internal()?
            .to_string_lossy()
            .into_owned())
    }

    fn turn_id(&self) -> Option<String> {
        std::env::var("CONDUCTIVE_TURN_ID").ok()
    }
}

/// Shared CLI and MCP service execution boundary.
#[async_trait]
pub trait ServiceTools: Send + Sync {
    /// Parse a local CLI call and execute it once.
    async fn cli(&self, args: &[String], request_id: &str) -> Result<ServiceLocalResponse>;
    /// Parse one MCP call without any authenticated configuration.
    async fn mcp(
        &self,
        name: ServiceName,
        fields: Map<String, Value>,
        request_id: &str,
    ) -> Result<ServiceLocalResponse>;
}

/// Local transport and context effects shared by both adapters.
pub struct LocalServices {
    /// A user-only Unix socket, never a Worker HTTP client.
    pub client: Arc<dyn LocalClient>,
    /// Folder and optional definition provenance.
    pub context: Arc<dyn LocalContext>,
}

/// Exit and MCP error status from the explicit service outcome.
pub fn failed(reply: &ServiceLocalResponse) -> bool {
    match reply {
        ServiceLocalResponse::Error { .. } => true,
        ServiceLocalResponse::Start { result, .. } => {
            result.service.status.state == ServiceState::Failed
        }
        ServiceLocalResponse::Control { result } => matches!(
            result.outcome,
            ServiceControlOutcome::Failed { .. }
                | ServiceControlOutcome::Unconfirmed
                | ServiceControlOutcome::ComputerStopped
                | ServiceControlOutcome::Stale
        ),
        ServiceLocalResponse::Logs { result } => {
            !matches!(result.result, ServiceRawLogResult::Ready { .. })
        }
        ServiceLocalResponse::List { .. } => false,
    }
}
