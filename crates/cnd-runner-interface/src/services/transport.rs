//! Optional private service traffic. Never number it or put it in the outbox.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use super::control::ServiceControlRequest;
use super::logs::ServiceLogRequest;

/// Part of a JSON document, split on Unicode boundaries within the envelope cap.
/// Count the complete outer message, including JSON escaping, against the
/// existing RUNNER_EVENT_MAX_BYTES budget. No new service or name limit applies.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceTextPart {
    /// Consecutive part number, starting at one for this transfer.
    #[ts(type = "number")]
    pub part_number: u64,
    /// True only on the last part of the complete document.
    pub final_part: bool,
    /// A fragment of JSON text, possibly inside an escaped string or field.
    /// Join every part, parse the typed document, then filter complete fields.
    /// Never filter serialized JSON or apply display cuts to a fragment.
    pub text: String,
}

/// Runner replies sent only after both hello and welcome enable services.
/// Partial assemblies are connection-local and restart with a fresh transfer.
/// No variant is a RunnerEvent or a durable numbered receipt.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerServiceMessage {
    /// Complete ServiceReport JSON in private parts, even for an empty report.
    #[serde(rename = "services.report.part")]
    ReportPart {
        /// New identity for this complete snapshot transfer.
        transfer_id: String,
        /// Assemble and parse before any filtering, storage, or display.
        part: ServiceTextPart,
    },
    /// Complete ServiceControlResult JSON. A fresh full report follows it.
    #[serde(rename = "services.control.result.part")]
    ControlResultPart {
        /// Original durable request identity. Verify the assembled receipt.
        request_id: String,
        /// Output-free receipt, separate from the chat command storage union.
        part: ServiceTextPart,
    },
    /// Complete ServiceRawLogResponse JSON. Never persist its raw assembly.
    #[serde(rename = "services.logs.part")]
    LogsPart {
        /// Original transient log request. A lost read can be reloaded.
        request_id: String,
        /// Keep only in memory. Parse and filter the complete retained source.
        part: ServiceTextPart,
    },
}

/// Independent commands. Never store them in the chat RunnerCommand prefix.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerServiceCommand {
    /// Ask for a new full snapshot without replaying private report parts.
    #[serde(rename = "services.report")]
    Report {
        /// Identity of this explicit refresh.
        request_id: String,
    },
    /// Explicit generation-bound Stop or Restart. Never resend after a lost reply.
    #[serde(rename = "services.control")]
    Control {
        /// Durable request identity and observed target.
        request: ServiceControlRequest,
    },
    /// Transient read of the complete retained log, before app filters.
    #[serde(rename = "services.logs")]
    Logs {
        /// Correlation identity and observed target.
        request: ServiceLogRequest,
    },
}
