//! One-time wake-up calls and Worker chat events.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::agents::Agent;
use crate::api::Timestamp;
use crate::wire::ReadonlyVec;

use super::session_types::{AgentSessionLink, SessionLogin};
use super::workspaces::AgentWorkspaceSummary;

/// Schedule one wake-up in the calling session.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged, rename_all_fields = "camelCase")]
pub enum AgentScheduleWakeUpRequest {
    /// Time measured from the Worker's receipt of the request.
    Delay {
        /// Text to give to the agent.
        text: String,
        /// Delay in seconds.
        delay_seconds: f64,
    },
    /// An absolute time, converted from the tool's offset date and time.
    Absolute {
        /// Text to give to the agent.
        text: String,
        /// Time in Unix milliseconds.
        at: Timestamp,
    },
}

/// The details of a pending wake-up.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct WakeUp {
    /// Stable identity of one wake-up.
    pub id: String,
    /// Time in Unix milliseconds.
    pub at: Timestamp,
    /// Time in UTC, for an agent or a copy of the chat.
    pub at_utc: String,
    /// The text that the agent set.
    pub text: String,
}

/// A wake-up admitted in the calling session.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentScheduleWakeUpResponse {
    /// Workspace of the calling session.
    pub workspace: AgentWorkspaceSummary,
    /// The calling session and its link.
    pub session: AgentSessionLink,
    /// The saved wake-up.
    pub wake_up: WakeUp,
}

/// Pending wake-ups of one session, soonest first.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentListWakeUpsResponse {
    /// Workspace of the session.
    pub workspace: AgentWorkspaceSummary,
    /// The session and its link.
    pub session: AgentSessionLink,
    /// Pending wake-ups of this session.
    #[ts(as = "ReadonlyVec<WakeUp>")]
    pub wake_ups: Vec<WakeUp>,
}

/// What Cancel found for a known wake-up.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "kebab-case")]
pub enum WakeUpCancelState {
    /// This call ended the pending wake-up.
    Cancelled,
    /// The wake-up already reached the session as a message.
    AlreadyFired,
    /// The wake-up was cancelled or could start no turn.
    AlreadyEnded,
}

/// The result of a cancel through the workspace tools.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentCancelWakeUpResponse {
    /// Workspace of the session.
    pub workspace: AgentWorkspaceSummary,
    /// The session and its link.
    pub session: AgentSessionLink,
    /// The cancelled or previously settled wake-up.
    pub wake_up_id: String,
    /// The outcome of the cancel.
    pub state: WakeUpCancelState,
}

/// Pending wake-ups at a fixed point in the browser event stream.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct SessionWakeUpsResponse {
    /// The workspace event number through which this snapshot is current.
    pub event_number: u64,
    /// Pending wake-ups of this session, soonest first.
    #[ts(as = "ReadonlyVec<WakeUp>")]
    pub wake_ups: Vec<WakeUp>,
}

/// The result of a cancel by a member in the app.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct SessionCancelWakeUpResponse {
    /// The workspace event number through the cancel.
    pub event_number: u64,
    /// The cancelled or previously settled wake-up.
    pub wake_up_id: String,
    /// The outcome of the cancel.
    pub state: WakeUpCancelState,
}

/// Where a cancel came from.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum WakeUpCancelSource {
    /// A member in the app.
    Member {
        /// Member's user ID.
        member_id: String,
    },
    /// A running agent made the tool call.
    Session {
        /// Workspace of the calling turn.
        workspace_id: String,
        /// The calling session.
        session_id: String,
    },
}

/// Why a wake-up could start no turn.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum WakeUpFailure {
    /// The workspace was archived.
    Archived,
    /// The session was closed.
    SessionClosed,
    /// The sender no longer has member access.
    SenderUnavailable,
    /// The starter no longer shares their login with the sender.
    LoginNotShared,
    /// The session has no usable login.
    LoginUnavailable {
        /// Agent of the session.
        agent: Agent,
        /// The login's owner, when one is known.
        owner: Option<SessionLogin>,
    },
}

/// A wake-up that ended without sending a message.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "kind", rename_all = "kebab-case")]
pub enum WakeUpEnd {
    /// Cancelled by a member or from a calling session.
    Cancelled {
        /// Where the cancel came from.
        source: WakeUpCancelSource,
    },
    /// Reached its time and could start no turn.
    CouldNotStart {
        /// The cause.
        reason: WakeUpFailure,
    },
}

/// Wake-up events that only the Worker can submit to the chat.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum SessionWakeUpEvent {
    /// A new pending wake-up.
    #[serde(rename = "session.wake-up-scheduled")]
    Scheduled {
        /// Session that set the wake-up.
        session_id: String,
        /// Details of the pending wake-up.
        wake_up: WakeUp,
    },
    /// The wake-up reached its session as a hidden ordinary message.
    #[serde(rename = "session.wake-up-fired")]
    Fired {
        /// Session that set the wake-up.
        session_id: String,
        /// The wake-up that fired.
        wake_up_id: String,
        /// The hidden message that carries the wake-up to the agent.
        message_id: String,
        /// The initial admission turn.
        turn_id: String,
        /// The text the agent set, before adding the shared lead.
        text: String,
    },
    /// The wake-up ended without a message.
    #[serde(rename = "session.wake-up-ended")]
    Ended {
        /// Session that set the wake-up.
        session_id: String,
        /// The wake-up that ended.
        wake_up_id: String,
        /// Scheduled time in Unix milliseconds.
        at: Timestamp,
        /// The cause and attribution of the end.
        outcome: WakeUpEnd,
    },
}
