//! One-shot session watches and Worker-originated wake notices.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::chat_events::TurnEndReason;

use super::session_types::AgentSessionLink;
use super::workspaces::AgentWorkspaceSummary;

/// Select an exact retained turn, or the session's current active work.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentWatchSessionRequest {
    /// Omission selects the current queued, running, or stopping turn.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub turn_id: Option<String>,
}

/// The terminal state of one watched turn.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum SessionWatchEndState {
    /// The turn finished.
    Finished,
    /// The turn failed.
    Failed,
    /// The turn stopped.
    Stopped,
}

/// Registration either records a watch or reports work that needs no watch.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(
    tag = "state",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
pub enum AgentWatchSessionResult {
    /// One watch is durably registered.
    Watching {
        /// Stable identity of coalesced intent.
        watch_id: String,
        /// The exact watched turn.
        turn_id: String,
    },
    /// The session has no active work.
    Idle,
    /// The exact turn already finished, so no watch was recorded.
    Finished {
        /// The exact retained turn.
        turn_id: String,
    },
    /// The exact turn already failed, so no watch was recorded.
    Failed {
        /// The exact retained turn.
        turn_id: String,
    },
    /// The exact turn already stopped, so no watch was recorded.
    Stopped {
        /// The exact retained turn.
        turn_id: String,
    },
}

/// The watched workspace and session with their registration outcome.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentWatchSessionResponse {
    /// The watched workspace.
    pub workspace: AgentWorkspaceSummary,
    /// The watched session and its canonical web link.
    pub session: AgentSessionLink,
    /// Flattened registration or terminal state.
    #[serde(flatten)]
    pub result: AgentWatchSessionResult,
}

/// A Worker notice, separate from events that a runner can submit.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum SessionWatchNotice {
    /// One accepted wake, stored in the caller's ordinary event sequence.
    #[serde(rename = "session.watch-notice")]
    Notice {
        /// Stable watch identity.
        watch_id: String,
        /// The hidden ordinary message that carries the wake to the agent.
        message_id: String,
        /// The calling session.
        session_id: String,
        /// Initial admission turn. The message mapping can later move it.
        turn_id: String,
        /// The watched workspace.
        watched_workspace_id: String,
        /// The watched session and its canonical web link.
        watched_session: AgentSessionLink,
        /// The exact watched turn.
        watched_turn_id: String,
        /// The normalized terminal state.
        state: SessionWatchEndState,
        /// Only an app-owned safe end reason, when one exists.
        reason: Option<TurnEndReason>,
    },
}
