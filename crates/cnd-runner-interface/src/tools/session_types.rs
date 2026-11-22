//! Session records and transcript detail used by workspace tools.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::agents::{Agent, AgentChoice};
use crate::api::Timestamp;
use crate::messages::MessageSender;
use crate::wire::ReadonlyVec;

/// TranscriptDetail wire values.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
pub enum TranscriptDetail {
    /// concise.
    #[serde(rename = "concise")]
    Concise,
    /// full.
    #[serde(rename = "full")]
    Full,
}

/// The owner of the login that a session keeps after its first message.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum SessionLogin {
    /// A member's personal login.
    Personal {
        /// The member who owns the login.
        #[serde(rename = "userId")]
        user_id: String,
    },
    /// The login owned by the workspace's org.
    Org {
        /// The org that owns the login.
        #[serde(rename = "orgId")]
        org_id: String,
    },
}

/// The app models absent from the last successful endpoint model list.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct DefaultLoginModelList {
    /// App model IDs that the endpoint did not list.
    #[ts(as = "ReadonlyVec<String>")]
    pub missing: Vec<String>,
    /// Time of the successful read, in Unix milliseconds.
    pub checked_at: Timestamp,
}

/// A member's resolved default for one org and agent, without a credential.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct DefaultAgentLogin {
    /// The org of new sessions that use this default.
    pub org_id: String,
    /// The current name of the org.
    pub org_name: String,
    /// The agent that uses this default.
    pub agent: Agent,
    /// No login means that the member must connect one.
    pub login: Option<SessionLogin>,
    /// Model availability for the selected endpoint, when a list was read.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub model_list: Option<DefaultLoginModelList>,
    /// Model availability for fixed org sessions, also with a personal default.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub org_model_list: Option<DefaultLoginModelList>,
}

/// The selected text and its location in the parent session.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct SessionAnchor {
    /// The session that holds the selected message.
    pub parent_session_id: String,
    /// The member message or finished agent answer that holds the selection.
    pub message_id: String,
    /// The rendered text of the selection.
    pub quote: String,
    /// The rendered text before the selection.
    pub before: String,
    /// The rendered text after the selection.
    pub after: String,
}

/// Session wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    /// id.
    pub id: String,
    /// workspace id.
    pub workspace_id: String,
    /// title.
    pub title: Option<String>,
    /// The agent stays fixed; another agent opens another session.
    pub choice: AgentChoice,
    /// created at.
    pub created_at: Timestamp,
    /// closed at.
    pub closed_at: Option<Timestamp>,
    /// active turn id.
    pub active_turn_id: Option<String>,
    /// The stored start time of the active turn, or null before dispatch.
    pub active_turn_started_at: Option<Timestamp>,
    /// retry message id.
    pub retry_message_id: Option<String>,
    /// started by.
    pub started_by: Option<MessageSender>,
    /// Absent before the first message and in older records.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub login: Option<Box<SessionLogin>>,
    /// The starter's current default owner, only before the first accepted message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_login: Option<Box<SessionLogin>>,
    /// The selection that started an explanation. Absent in older records.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub anchor: Option<Box<SessionAnchor>>,
    /// source session id.
    pub source_session_id: Option<String>,
    /// login available.
    pub login_available: bool,
    /// login shared.
    pub login_shared: bool,
}

/// An accepted session with its canonical web link.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentLinkedSession {
    /// session.
    #[serde(flatten)]
    pub session: Session,
    /// link.
    pub link: String,
}

/// The identity and canonical web link of a session.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentSessionLink {
    /// id.
    pub id: String,
    /// link.
    pub link: String,
}
