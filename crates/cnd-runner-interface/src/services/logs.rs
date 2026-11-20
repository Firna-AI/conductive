//! Service log requests and raw runtime replies, separate from app excerpts.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::control::ServiceFailure;
use super::process::ServiceTarget;

/// A single read of the observed service run. It never follows output.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceLogRequest {
    /// Correlates the transient read and its private parts.
    pub request_id: String,
    /// Observed computer and service generation.
    pub target: ServiceTarget,
}

/// Complete retained runtime source. Never store this reply in the Worker.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum ServiceRawLogResult {
    /// Complete retained text, before Worker filters and app excerpts.
    Ready {
        /// Join transport parts and decode JSON before filtering this text.
        text: String,
        /// Rotation has already removed older output.
        omitted: bool,
    },
    /// The observed computer or service generation is no longer current.
    Stale,
    /// No such service remains in this computer run.
    NotFound,
    /// The runtime log cannot be read now.
    Failed {
        /// Explanation without private definitions or environment values.
        error: ServiceFailure,
    },
}

/// Raw reply for the local socket or negotiated private transport only.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceRawLogResponse {
    /// Original request and its observed generation.
    pub request: ServiceLogRequest,
    /// Bounded retained source. Worker assembly lives only in memory.
    pub result: ServiceRawLogResult,
}

/// Total retained bytes across a service's rotating runtime logs.
pub const SERVICE_LOG_MAX_BYTES: u64 = 10_485_760;

/// Maximum lines of an app log excerpt after complete-text filtering.
pub const SERVICE_APP_LOG_MAX_LINES: u64 = 200;

/// Maximum UTF-8 bytes of an app log excerpt after complete-text filtering.
pub const SERVICE_APP_LOG_MAX_BYTES: u64 = 65_536;
