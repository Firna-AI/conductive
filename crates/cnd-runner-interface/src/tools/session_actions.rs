//! Session management and message lookup tool contracts.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::api::Timestamp;
use crate::messages::{MessageSender, UserMessageState};

use super::session_reads::AgentSessionSummary;
use super::session_types::AgentSessionLink;
use super::workspaces::AgentWorkspaceSummary;

/// AgentSessionResponse wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentSessionResponse {
    /// workspace.
    pub workspace: AgentWorkspaceSummary,
    /// session.
    pub session: AgentSessionSummary,
}

/// AgentRenameSessionRequest wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentRenameSessionRequest {
    /// title.
    pub title: String,
}

/// AgentCloseSessionRequest wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentCloseSessionRequest {
    /// stop running turn.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub stop_running_turn: Option<bool>,
}

/// AgentStopSessionState wire values.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
pub enum AgentStopSessionState {
    /// idle.
    #[serde(rename = "idle")]
    Idle,
    /// stopped.
    #[serde(rename = "stopped")]
    Stopped,
    /// stopping.
    #[serde(rename = "stopping")]
    Stopping,
}

/// AgentStopSessionResponse wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentStopSessionResponse {
    /// response.
    #[serde(flatten)]
    pub response: AgentSessionResponse,
    /// turn id.
    pub turn_id: Option<String>,
    /// state.
    pub state: AgentStopSessionState,
}

/// The query of `get_message`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentGetMessageRequest {
    /// The caller reads the agent variant of [`AgentMessageSummary`]. Older
    /// runners send no query and cannot read that variant, so the Worker
    /// answers them with HTTP 404 for the ID of an agent message.
    pub agent_messages: bool,
}

/// The message fields returned by the workspace tool, by the author of the
/// message.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "author", rename_all_fields = "camelCase")]
pub enum AgentMessageSummary {
    /// A message that a member sent, also through a tool or a wake.
    #[serde(rename = "member")]
    Member {
        /// id.
        id: String,
        /// session id.
        session_id: String,
        /// sender.
        sender: MessageSender,
        /// The stored text.
        text: String,
        /// state.
        state: UserMessageState,
        /// The time when the workspace accepted the message.
        created_at: Timestamp,
    },
    /// A finished message of the agent of the session.
    #[serde(rename = "agent")]
    Agent {
        /// id.
        id: String,
        /// session id.
        session_id: String,
        /// The finished text, as the chat shows it.
        text: String,
        /// The time of the finished message.
        created_at: Timestamp,
    },
}

/// AgentGetMessageResponse wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentGetMessageResponse {
    /// workspace.
    pub workspace: AgentWorkspaceSummary,
    /// session.
    pub session: AgentSessionLink,
    /// message.
    pub message: AgentMessageSummary,
    /// The turn that took a member message, or the turn that wrote an agent
    /// message.
    pub turn_id: Option<String>,
}
