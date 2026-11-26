//! Service identity, process results, and selected metadata shared by reports.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::api::Timestamp;
use crate::wire::ReadonlyVec;

/// One registered service and one run of its definition.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceIdentity {
    /// Opaque identity, independent of the exact display name and systemd unit.
    pub service_id: String,
    /// New opaque identity for each run, including a failed start.
    pub generation: String,
}

/// The observed computer run and service run that a request may affect.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceTarget {
    /// Identity of the current computer run, unchanged by a runner restart.
    pub boot_id: String,
    /// The observed service and generation.
    #[serde(flatten)]
    pub identity: ServiceIdentity,
}

/// Lifecycle state of the last run. A stopped or ended record stays registered.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum ServiceState {
    /// The process started and has not ended.
    Running,
    /// An explicit Stop ended the run.
    Stopped,
    /// The process exited with code zero without Stop.
    Ended,
    /// The process failed, received a signal, or could not start.
    Failed,
}

/// Process outcome, without raw commands, environment values, or diagnostics.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum ServiceProcessResult {
    /// The process exited with this code.
    Exit {
        /// Process exit code.
        code: i32,
    },
    /// This signal ended the process.
    Signal {
        /// Numeric signal identifier.
        signal: i32,
    },
    /// A memory kill ended the whole service unit.
    OutOfMemory,
    /// The service command could not start.
    StartFailed,
}

/// State and times of one service run. Dates use Unix milliseconds.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceStatus {
    /// Current state of the run.
    pub state: ServiceState,
    /// Time of the start attempt, including an attempt that could not launch.
    pub started_at: Timestamp,
    /// Time of the end, or null while running.
    pub ended_at: Option<Timestamp>,
    /// Last process result, or null while running.
    pub result: Option<ServiceProcessResult>,
}

/// Selected service data. A runner preserves complete labels until filtering.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceSummary {
    /// Stable service identity and current generation.
    #[serde(flatten)]
    pub identity: ServiceIdentity,
    /// Complete exact name. The Worker filters it but never cuts it.
    pub name: String,
    /// Selected program label, or null when selection gives no label.
    pub program: Option<String>,
    /// Selected folder label, or null when selection gives no label.
    pub folder: Option<String>,
    /// Last run state and result.
    pub status: ServiceStatus,
    /// All ports owned by this service under the existing scanner rules.
    #[ts(as = "ReadonlyVec<u16>")]
    pub ports: Vec<u16>,
}
