//! Workspace records returned by the workspace tools.

use serde::de::IgnoredAny;
use serde::{Deserialize, Deserializer, Serialize};
use ts_rs::TS;

use crate::agents::AgentChoice;
use crate::api::Timestamp;
use crate::messages::MessageSender;
use crate::tools::merge_queue::{MergeQueueEntry, MergeQueueListLabels};

/// Workspace activity; input means the agent waits for a user action.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
pub enum WorkspaceState {
    /// working.
    #[serde(rename = "working")]
    Working,
    /// input.
    #[serde(rename = "input")]
    Input,
    /// unread.
    #[serde(rename = "unread")]
    Unread,
    /// ready.
    #[serde(rename = "ready")]
    Ready,
    /// starting.
    #[serde(rename = "starting")]
    Starting,
    /// stopped.
    #[serde(rename = "stopped")]
    Stopped,
    /// error.
    #[serde(rename = "error")]
    Error,
    /// archived.
    #[serde(rename = "archived")]
    Archived,
}

/// The pull request bar state shown in a workspace list.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
pub enum GitHubSummary {
    /// checks-running.
    #[serde(rename = "checks-running")]
    ChecksRunning,
    /// checks-failed.
    #[serde(rename = "checks-failed")]
    ChecksFailed,
    /// ready-to-merge.
    #[serde(rename = "ready-to-merge")]
    ReadyToMerge,
    /// merged.
    #[serde(rename = "merged")]
    Merged,
    /// conflict.
    #[serde(rename = "conflict")]
    Conflict,
    /// changes-requested.
    #[serde(rename = "changes-requested")]
    ChangesRequested,
    /// draft.
    #[serde(rename = "draft")]
    Draft,
    /// blocked.
    #[serde(rename = "blocked")]
    Blocked,
}

/// Recorded evidence about an archived workspace's cloud computer.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "kebab-case")]
pub enum ArchivedComputerState {
    /// An identified computer or an unresolved create request can still exist.
    MayExist,
    /// All possible computers are resolved and a known computer has a confirmed delete.
    Deleted,
    /// No recorded evidence establishes the computer's outcome.
    Unknown,
}

/// Computer evidence and the original Restore cutoff, independent of Restore availability.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ArchivedComputer {
    /// The certainty of the computer's outcome.
    pub state: ArchivedComputerState,
    /// The original Archive time plus the Restore window, also without a kept computer.
    pub restore_until: Timestamp,
}

#[derive(Deserialize)]
#[serde(untagged)]
enum CompatibleArchivedComputer {
    Known(ArchivedComputer),
    Unknown(IgnoredAny),
}

fn deserialize_archived_computer<'de, D>(
    deserializer: D,
) -> Result<Option<ArchivedComputer>, D::Error>
where
    D: Deserializer<'de>,
{
    Ok(
        match CompatibleArchivedComputer::deserialize(deserializer)? {
            CompatibleArchivedComputer::Known(computer) => Some(computer),
            CompatibleArchivedComputer::Unknown(_) => None,
        },
    )
}

/// The complete workspace record returned by creation.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct Workspace {
    /// id.
    pub id: String,
    /// number.
    pub number: u64,
    /// link.
    pub link: String,
    /// org id.
    pub org_id: String,
    /// repository id.
    pub repository_id: String,
    /// section id.
    pub section_id: String,
    /// Parent workspace, or null for a top-level workspace.
    pub parent_id: Option<String>,
    /// owner.
    pub owner: MessageSender,
    /// name.
    pub name: Option<String>,
    /// branch.
    pub branch: String,
    /// choice.
    pub choice: AgentChoice,
    /// state.
    pub state: WorkspaceState,
    /// github.
    pub github: Option<GitHubSummary>,
    /// The entry when this workspace is in the merge queue.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub merge_queue: Option<MergeQueueEntry>,
    /// Whether the viewing member can write to the repository on GitHub.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub github_can_write: Option<bool>,
    /// The base branch of the open pull request on GitHub.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub github_pull_base: Option<String>,
    /// The filtered branch labels for the queue controls of this workspace.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub merge_queue_labels: Option<MergeQueueListLabels>,
    /// Whether only a fork has an open pull request for the branch name.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub github_pull_from_fork: Option<bool>,
    /// Whether a message waits in the queue while the workspace starts.
    /// Each read and reply of the Worker sets it for a starting workspace.
    /// An event record leaves it out.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub message_waiting: Option<bool>,
    /// created at.
    pub created_at: Timestamp,
    /// updated at.
    pub updated_at: Timestamp,
    /// archived at.
    pub archived_at: Option<Timestamp>,
    /// restore until.
    pub restore_until: Option<Timestamp>,
    /// Optional computer evidence for an archived workspace with a known Archive date.
    #[serde(
        default,
        skip_serializing_if = "Option::is_none",
        deserialize_with = "deserialize_archived_computer"
    )]
    #[ts(optional)]
    pub archived_computer: Option<ArchivedComputer>,
}
