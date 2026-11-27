//! RunnerHandshake wire contracts.

use serde::{Deserialize, Deserializer, Serialize, Serializer, de::Error};
use ts_rs::TS;

use crate::api::Timestamp;
use crate::runner::RunnerEvent;
use crate::runner_commands::RunnerCommand;
use crate::runner_credentials::RunnerLoginKind;
use crate::runner_files::RunnerFileResponse;
use crate::runner_repository::RunnerRepositoryMoveRefused;
use crate::runner_skills::RunnerSkillResult;
use crate::services::transport::{RunnerServiceCommand, RunnerServiceMessage};
use crate::wire::ReadonlyVec;

/// RunnerToWorkspace wire alternatives.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged)]
pub enum RunnerToWorkspace {
    /// RunnerHello.
    RunnerHello(RunnerHello),
    /// RunnerEventEnvelope.
    RunnerEventEnvelope(RunnerEventEnvelope),
    /// RunnerFileResponse.
    RunnerFileResponse(RunnerFileResponse),
    /// Skill read result outside the numbered outbox.
    RunnerSkillResult(RunnerSkillResult),
    /// RunnerRepositoryMoveRefused.
    RunnerRepositoryMoveRefused(RunnerRepositoryMoveRefused),
    /// Optional private services traffic. Never retained in the numbered outbox.
    RunnerServiceMessage(RunnerServiceMessage),
}

/// The bearer token authenticates the outbound socket on the machine hostname.
/// Send hello first. Unsupported versions close before welcome or commands.
/// A stream ID and its counter persist with the runner outbox across reconnects.
/// An outbox contains events only. It must never contain turn credentials.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerHello {
    /// hello.
    #[serde(rename = "hello")]
    Hello {
        /// protocolVersion.
        protocol_version: RunnerProtocolVersion,
        /// workspaceId.
        workspace_id: String,
        /// streamId.
        stream_id: String,
        /// One runner program start, retained across reconnections and fresh links.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        process_start_id: Option<String>,
        /// loginKinds.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        #[ts(as = "Option<ReadonlyVec<RunnerLoginKind>>")]
        login_kinds: Option<Vec<RunnerLoginKind>>,
        /// The runner's repository folder. Its presence means that the runner
        /// accepts repository.move. Older runners omit it.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        repository_folder: Option<String>,
        /// Offer complete tool sources in private numbered parts.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        complete_tool_details: Option<bool>,
        /// True while this runner's repository file server listens.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        file_server: Option<bool>,
        /// This runner answers skill reads.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        skill_reads: Option<bool>,
        /// This runner can deliver app notes and acknowledge the lines read.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        capability_notices: Option<bool>,
        /// Offer independent service traffic. Absent means no service support.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        services: Option<bool>,
        /// Offer changes deltas. Absent means full changes lists only.
        #[serde(
            default,
            skip_serializing_if = "Option::is_none",
            with = "changes_deltas"
        )]
        #[ts(optional, type = "boolean")]
        changes_deltas: Option<bool>,
    },
}

/// Each stream numbers events from 1. Retries keep the same number and payload.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerEventEnvelope {
    /// event.
    #[serde(rename = "event")]
    Event {
        /// streamId.
        stream_id: String,
        /// eventNumber.
        #[ts(type = "number")]
        event_number: u64,
        /// occurredAt.
        occurred_at: Timestamp,
        /// event.
        event: RunnerEvent,
    },
}

/// WorkspaceToRunner wire alternatives.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged)]
pub enum WorkspaceToRunner {
    /// RunnerWelcome.
    RunnerWelcome(RunnerWelcome),
    /// RunnerConfirm.
    RunnerConfirm(RunnerConfirm),
    /// RunnerResend.
    RunnerResend(RunnerResend),
    /// RunnerCommand.
    RunnerCommand(Box<RunnerCommand>),
    /// Optional services controls, outside the stored chat command union.
    RunnerServiceCommand(RunnerServiceCommand),
}

/// On welcome, discard confirmed outbox entries and resend every later entry.
/// On resend, send every retained entry from fromEventNumber, in number order.
/// A duplicate is confirmed again but is neither stored nor broadcast again.
/// A gap requests resend. It never advances the stored cursor.
/// The workspace gives browser events its own numbers across runner streams.
/// Refusal reasons are too_large, invalid, and turn_not_active. A refusal
/// stores one workspace-only marker before confirming and advancing the cursor.
/// A refused turn.completed or turn.failed still ends its active turn.
/// A storage or network failure is not a refusal. Close without confirming.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerWelcome {
    /// welcome.
    #[serde(rename = "welcome")]
    Welcome {
        /// protocolVersion.
        protocol_version: RunnerProtocolVersion,
        /// streamId.
        stream_id: String,
        /// confirmedThrough.
        #[ts(type = "number")]
        confirmed_through: u64,
        /// Accept the optional complete tool source offer.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        complete_tool_details: Option<bool>,
        /// Accept independent services only when hello also offered them.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional)]
        services: Option<bool>,
        /// Accept changes deltas only when hello also offered them.
        #[serde(
            default,
            skip_serializing_if = "Option::is_none",
            with = "changes_deltas"
        )]
        #[ts(optional, type = "boolean")]
        changes_deltas: Option<bool>,
    },
}

/// Read a non-boolean changes delta capability as absent.
mod changes_deltas {
    use serde::{Deserialize, Deserializer, Serialize, Serializer, de::IgnoredAny};

    #[derive(Deserialize)]
    #[serde(untagged)]
    enum Capability {
        Boolean(bool),
        Other(IgnoredAny),
    }

    pub(super) fn deserialize<'de, D: Deserializer<'de>>(
        deserializer: D,
    ) -> Result<Option<bool>, D::Error> {
        Ok(match Capability::deserialize(deserializer)? {
            Capability::Boolean(flag) => Some(flag),
            Capability::Other(_) => None,
        })
    }

    pub(super) fn serialize<S: Serializer>(
        flag: &Option<bool>,
        serializer: S,
    ) -> Result<S::Ok, S::Error> {
        flag.serialize(serializer)
    }
}

/// A confirm covers contiguous stored events or their stored refusal markers.
/// The runner removes either result from its outbox and never retries it.
/// A confirmed file part includes durable assembly state across reconnects.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerConfirm {
    /// confirm.
    #[serde(rename = "confirm")]
    Confirm {
        /// streamId.
        stream_id: String,
        /// throughEventNumber.
        #[ts(type = "number")]
        through_event_number: u64,
    },
}

/// RunnerResend.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerResend {
    /// resend.
    #[serde(rename = "resend")]
    Resend {
        /// streamId.
        stream_id: String,
        /// fromEventNumber.
        #[ts(type = "number")]
        from_event_number: u64,
    },
}

/// The only supported runner protocol version.
pub const RUNNER_PROTOCOL_VERSION: u8 = 2;

/// Maximum compact JSON bytes in a complete runner event envelope.
pub const RUNNER_EVENT_MAX_BYTES: u64 = 1_048_576;

/// Only protocol version 2 is valid on the wire.
#[derive(Debug, Clone, PartialEq, TS)]
#[ts(type = "2")]
pub struct RunnerProtocolVersion;

impl Serialize for RunnerProtocolVersion {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_u8(RUNNER_PROTOCOL_VERSION)
    }
}

impl<'de> Deserialize<'de> for RunnerProtocolVersion {
    fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        if u8::deserialize(deserializer)? == RUNNER_PROTOCOL_VERSION {
            Ok(Self)
        } else {
            Err(D::Error::custom("unsupported runner protocol version"))
        }
    }
}
