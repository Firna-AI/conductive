//! Generation-bound service controls and their durable, output-free receipts.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::process::ServiceTarget;

/// The two explicit service controls. Neither creates a definition.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum ServiceControlAction {
    /// End the service process tree.
    Stop,
    /// Start a new run with the saved definition and its original provenance.
    Restart,
}

/// A stable request identity and the exact observed run that it targets.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceControlRequest {
    /// Durable deduplication identity. Repeated delivery acts at most once.
    pub request_id: String,
    /// A stale boot or generation changes nothing.
    pub target: ServiceTarget,
    /// Explicit requested action.
    pub action: ServiceControlAction,
}

/// An operation failure. Public callers filter its complete message before use.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceFailure {
    /// Machine-readable operation failure code.
    pub code: String,
    /// Explanation without a definition or environment values.
    pub message: String,
}

/// A control receipt never implies that an unconfirmed request should retry.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum ServiceControlOutcome {
    /// The requested action completed. A fresh report gives the resulting run.
    Applied,
    /// Stop found the observed service already not running.
    Unchanged,
    /// The observed boot, service, or generation is no longer current.
    Stale,
    /// The connection ended before a reply. Refresh state without resending.
    Unconfirmed,
    /// The computer stopped. This request must never run after a resume.
    ComputerStopped,
    /// The action failed with this explanation.
    Failed {
        /// Filter before persistence or display outside the computer.
        error: ServiceFailure,
    },
}

/// Correlated control result, safe to retain separately from chat commands.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceControlResult {
    /// Original request, including the observed generation and action.
    pub request: ServiceControlRequest,
    /// Outcome of this request, without raw output or a service definition.
    pub outcome: ServiceControlOutcome,
}
