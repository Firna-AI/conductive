//! Local-only definitions and CLI/MCP calls. These never use Worker routes.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::wire::ReadonlyVec;

use super::control::{ServiceControlRequest, ServiceControlResult, ServiceFailure};
use super::logs::{ServiceLogRequest, ServiceRawLogResponse};
use super::process::{ServiceStatus, ServiceTarget};

/// Private runtime definition. It has no debug formatter and is never reported.
#[derive(Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceDefinition {
    /// Executable followed by its exact arguments. Never privileged shell text.
    #[ts(as = "ReadonlyVec<String>")]
    pub command: Vec<String>,
    /// Current folder captured by the local caller.
    pub folder: String,
    /// Explicit values only. The manager adds org and basic user variables.
    pub env: BTreeMap<String, String>,
}

/// An optional wait for an owned listener, with the fixed readiness deadline.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum ServicePortWait {
    /// Wait for the first listener that this service owns.
    First,
    /// Wait for this port, only when this service owns its listener.
    Port {
        /// Requested TCP port.
        port: u16,
    },
}

/// Start with a supplied definition, without any turn or workspace credential.
#[derive(Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceStartRequest {
    /// Deduplication identity for the local Start.
    pub request_id: String,
    /// Exact name, with no product pattern or length limit.
    pub name: String,
    /// Used only for a new service or one that is not running.
    pub definition: ServiceDefinition,
    /// Untrusted caller turn ID. Only the Worker can match it to a session.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub originating_turn_id: Option<String>,
    /// Absent means return when the run starts. No custom timeout is accepted.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub wait_for_port: Option<ServicePortWait>,
}

/// Printable local record. It has raw arguments and folder, never env values.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceLocalEntry {
    /// Current observed identity for subsequent control and log requests.
    pub target: ServiceTarget,
    /// Exact service name.
    pub name: String,
    /// Command of the saved definition, also when Start returns unchanged.
    #[ts(as = "ReadonlyVec<String>")]
    pub command: Vec<String>,
    /// Folder of the saved definition.
    pub folder: String,
    /// Last run state, times, and result.
    pub status: ServiceStatus,
    /// All currently owned ports.
    #[ts(as = "ReadonlyVec<u16>")]
    pub ports: Vec<u16>,
}

/// Whether Start attempted the supplied definition or kept the running one.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "snake_case")]
pub enum ServiceStartOutcome {
    /// A new generation attempted the supplied definition, including a failed start.
    Started,
    /// The named service was running. Start changed nothing.
    AlreadyRunning,
}

/// Outcome of the optional readiness wait. A timeout never stops the service.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum ServiceReadiness {
    /// Start returned without waiting for a port.
    NotRequested,
    /// The service owns this listener.
    Ready {
        /// Confirmed owned port.
        port: u16,
    },
    /// The fixed wait ended without a confirmed owned port.
    NotConfirmed,
    /// The service ended during the wait. Its record gives the process result.
    Ended,
}

/// Local Start outcome with the actual saved command and current run.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceStartResult {
    /// Actual saved service, including when it differs from the supplied input.
    pub service: ServiceLocalEntry,
    /// Whether this request launched a new run.
    pub outcome: ServiceStartOutcome,
    /// Optional readiness outcome, separate from process success or failure.
    pub readiness: ServiceReadiness,
}

/// User-only local socket inputs shared by CLI and MCP adapters.
#[derive(Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(
    tag = "type",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum ServiceLocalRequest {
    /// Start or reuse an exact service name.
    Start {
        /// Supplied private definition and optional wait.
        request: ServiceStartRequest,
    },
    /// Read every registered service, including those with no port.
    List {
        /// Correlates this local read.
        request_id: String,
    },
    /// Explicit Stop or Restart with a stable request ID and observed target.
    Control {
        /// Control input. Restart takes no new definition.
        request: ServiceControlRequest,
    },
    /// Read a service's complete retained runtime output.
    Logs {
        /// Transient read input.
        request: ServiceLogRequest,
    },
}

/// Printable replies. No variant contains an environment map or definition.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(
    tag = "type",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum ServiceLocalResponse {
    /// Actual Start result.
    Start {
        /// Original local request identity.
        request_id: String,
        /// Actual saved command, run state, and readiness outcome.
        result: ServiceStartResult,
    },
    /// Full local catalogue of this computer run.
    List {
        /// Original local request identity.
        request_id: String,
        /// Current computer run.
        boot_id: String,
        /// Every registered service, without a count limit.
        #[ts(as = "ReadonlyVec<ServiceLocalEntry>")]
        services: Vec<ServiceLocalEntry>,
    },
    /// Correlated Stop or Restart outcome.
    Control {
        /// Output-free control receipt.
        result: ServiceControlResult,
    },
    /// Complete retained local output, without app excerpt cuts.
    Logs {
        /// Raw runtime reply. Never persist it in the Worker.
        result: ServiceRawLogResponse,
    },
    /// The local request could not complete.
    Error {
        /// Original local request identity.
        request_id: String,
        /// Explanation without definitions or environment values.
        error: ServiceFailure,
    },
}

/// Fixed maximum readiness wait. The caller cannot choose another timeout.
pub const SERVICE_READINESS_MAX_SECONDS: u64 = 30;
