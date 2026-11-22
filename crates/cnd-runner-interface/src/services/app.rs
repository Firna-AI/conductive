//! Feature API replies for services. These add no browser socket message kind.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::agents::Agent;
use crate::wire::ReadonlyVec;

use super::control::ServiceFailure;
use super::logs::ServiceLogRequest;
use super::process::ServiceSummary;

/// Worker-matched start context. It never identifies or authorizes a person.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(
    tag = "kind",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum ServiceSource {
    /// No originating turn matched the Worker's own records.
    LocalCommand,
    /// The Worker matched the definition's original turn to this session.
    Session {
        /// Session link target in this workspace.
        session_id: String,
        /// Current session title, or null for an untitled session.
        title: Option<String>,
        /// Agent icon of the matched session.
        agent: Agent,
    },
}

/// Public row after complete-field filtering and the existing label cuts.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceRow {
    /// Complete filtered name, selected program and folder, status, and ports.
    #[serde(flatten)]
    pub service: ServiceSummary,
    /// Definition provenance, preserved by Restart.
    pub source: ServiceSource,
}

/// Complete filtered catalogue for one computer run and revision.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceCatalogueSnapshot {
    /// Identity of the current computer run.
    pub boot_id: String,
    /// Strictly increasing within this boot, also across runner restarts.
    #[ts(type = "number")]
    pub revision: u64,
    /// Every service, ordered by its full filtered name.
    #[ts(as = "ReadonlyVec<ServiceRow>")]
    pub services: Vec<ServiceRow>,
}

/// Unsupported software differs from a supported empty report and a stopped PC.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum ServiceCatalogue {
    /// The runner and Worker did not negotiate service support.
    Unsupported,
    /// The cloud computer stopped. No catalogue from an earlier run is shown.
    Stopped,
    /// Current complete report, including an empty services array.
    Ready {
        /// Filtered report for this computer run.
        snapshot: ServiceCatalogueSnapshot,
    },
}

/// App log outcome, separate from the complete raw runtime response.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "state", rename_all = "snake_case")]
pub enum ServiceLogResult {
    /// Complete-text filtering precedes the last 200 lines and 64 KiB excerpt.
    Ready {
        /// Filtered plain text. Render it as text, never HTML or terminal input.
        text: String,
        /// Rotation or the app excerpt removed earlier output.
        omitted: bool,
    },
    /// The observed service generation changed. Refresh the catalogue.
    Stale,
    /// The service no longer exists in this computer run.
    NotFound,
    /// Services are unsupported, disconnected, or the computer stopped.
    Unavailable,
    /// The read failed. A new explicit read can try again.
    Failed {
        /// Complete filtered explanation.
        error: ServiceFailure,
    },
}

/// One app log read. Its filtered output is never a browser socket event.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ServiceLogResponse {
    /// Original request and its observed generation.
    pub request: ServiceLogRequest,
    /// Filtered excerpt or explicit failure outcome.
    pub result: ServiceLogResult,
}
