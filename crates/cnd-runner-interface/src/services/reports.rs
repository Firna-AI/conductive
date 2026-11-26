//! Complete selected service snapshots, without private runtime definitions.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::wire::ReadonlyVec;

use super::process::ServiceSummary;

/// Selected runner data before the Worker filters complete parsed text fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceReportEntry {
    /// Complete name and selected labels, state, results, and all owned ports.
    #[serde(flatten)]
    pub service: ServiceSummary,
    /// Original definition's turn ID. The Worker derives the session itself.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub originating_turn_id: Option<String>,
}

/// Full report. A new boot replaces the old report regardless of revision.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceReport {
    /// Computer run identity, unchanged by runner restarts or reconnects.
    pub boot_id: String,
    /// Only a higher revision replaces a report of the same boot.
    #[ts(type = "number")]
    pub revision: u64,
    /// All registered services, including an empty list and ended records.
    #[ts(as = "ReadonlyVec<ServiceReportEntry>")]
    pub services: Vec<ServiceReportEntry>,
}
