//! Private complete tool sources, carried only by numbered runner receipts.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::chat_events::{ToolCall, TurnEventContext};

/// Tool identity and metadata, sent once at the start of a private source.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct RunnerToolDetailStart {
    /// Original turn identity.
    #[serde(flatten)]
    pub turn_event_context: TurnEventContext,
    /// Original tool metadata, with null detail.
    pub tool: ToolCall,
}

/// Consecutive parts of one already runner-filtered tool update.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerToolDetailPart {
    /// One private source chunk. Only its completed assembly is public.
    #[serde(rename = "tool.detail.part")]
    ToolDetailPart {
        /// Original identity and metadata on the first part only.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        start: Option<RunnerToolDetailStart>,
        /// Complete runner-filtered source, split on Unicode boundaries.
        detail: String,
        /// Starts at one for each tool update.
        #[ts(type = "number")]
        part_number: u64,
        /// True only for the last chunk of the complete source.
        final_part: bool,
    },
}
