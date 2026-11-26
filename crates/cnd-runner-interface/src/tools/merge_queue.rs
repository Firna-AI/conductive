//! Merge queue fields in the workspace list and GitHub bar.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// The current step of a queued workspace.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "kebab-case")]
pub enum MergeQueueEntryState {
    /// The workspace has a place in the queue.
    Queued,
    /// The queue is moving the head onto its base.
    Restacking,
    /// The queue has started a merge.
    Merging,
    /// The queue is waiting for a condition to change.
    Waiting,
}

/// A condition that holds an entry in its place.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "kebab-case")]
pub enum MergeQueueWait {
    /// Required checks have to pass.
    Checks,
    /// A review has to change.
    Review,
    /// The head needs a rebase onto its base.
    Rebase,
    /// A rule of the repository holds the merge.
    Rules,
    /// Local work has to be pushed.
    Push,
    /// A local-work read failed or cannot run yet.
    LocalWork,
    /// The queue has to verify the change of default branch.
    TrunkChange,
    /// A pull request earlier in the queue holds the merge.
    LowerLayer,
    /// The queuer's GitHub token stopped working.
    Token,
    /// A turn in the workspace must end before the queue sends its message.
    ActiveTurn,
    /// The newest open session needs a login that the queuer can use.
    AgentLogin,
    /// The workspace needs an open session for the queue message.
    OpenSession,
    /// GitHub refused the merge.
    MergeRefused,
}

/// The queue entry returned in the workspace list.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct MergeQueueEntry {
    /// The queue of this repository in the org.
    pub queue_id: String,
    /// The place of the entry, starting at 1.
    pub place: u64,
    /// The unit shared by entries that move together.
    pub unit_id: String,
    /// The current step.
    pub state: MergeQueueEntryState,
    /// The number of the queued pull request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub pull_number: Option<u64>,
    /// The planned result of removing this entry.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub removal: Option<MergeQueueRemoval>,
}

/// A branch label after the workspace's output filter.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
pub struct MergeQueueBranchLabel {
    /// The branch text shown to the member.
    pub text: String,
}

/// Branch labels used by the workspace list's queue controls.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct MergeQueueListLabels {
    /// The filtered name of the repository's default branch.
    pub default_branch: MergeQueueBranchLabel,
    /// The filtered GitHub base of this workspace's open pull request.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub pull_base: Option<MergeQueueBranchLabel>,
}

/// A member-stack layer that leaves with the selected workspace.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct MergeQueueLeavingLayer {
    /// The workspace that leaves with the selected entry.
    pub workspace_id: String,
    /// The number of its pull request.
    pub pull_number: u64,
}

/// The queue's removal plan, with a filtered base label for the question.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
pub struct MergeQueueRemoval {
    /// The base the selected pull request will target after removal.
    pub base: MergeQueueBranchLabel,
    /// The higher pull requests in the same unit that also leave.
    pub above: Vec<MergeQueueLeavingLayer>,
}

/// The branch selected by queue order and the commits that a rebase uses.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct MergeQueueRebase {
    /// The branch name used to build the filtered label.
    pub base: String,
    /// The filtered label for a member control.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub label: Option<MergeQueueBranchLabel>,
    /// The selected base head when the queue has verified it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub base_head: Option<String>,
    /// The commit where this layer's own commits begin.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub old_base: Option<String>,
}

/// The queue state returned with a workspace's GitHub bar.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct MergeQueueBarState {
    /// The place of the entry, starting at 1.
    pub place: u64,
    /// The number of entries in the queue.
    pub count: u64,
    /// The pull request below this workspace, or null for the bottom entry.
    pub below_pull_number: Option<u64>,
    /// The branch at the bottom of the queue.
    pub trunk: String,
    /// The filtered label of the branch at the bottom of the queue.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub trunk_label: Option<MergeQueueBranchLabel>,
    /// The current step.
    pub state: MergeQueueEntryState,
    /// The condition that the entry waits for, if any.
    pub wait: Option<MergeQueueWait>,
    /// Earlier layers a member can merge with this entry, when GitHub and the workspace are ready.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub merge_ahead: Option<u64>,
    /// The lower pull request that holds this layer.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub blocked_by_pull_number: Option<u64>,
    /// The commit where the queued layer's own commits begin.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub old_base: Option<String>,
    /// The rebase input selected by queue order.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub rebase: Option<MergeQueueRebase>,
}

/// Repository metadata returned with an org's workspace list.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceListRepository {
    /// The repository ID in this org.
    pub id: String,
    /// The GitHub name, including the owner.
    pub full_name: String,
    /// The repository's saved default branch.
    pub default_branch: String,
    /// Whether the org selected this repository for new workspaces.
    pub selected: bool,
    /// Whether GitHub requires its own queue on the default branch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub github_queue_required: Option<bool>,
    /// Whether another org has entries or is creating a stack for this repository.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub queue_in_use: Option<bool>,
}

/// Merges this pull request with the number of earlier layers shown by the bar.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
pub struct RequestQueueMerge {
    /// Earlier layers named by the bar. Zero names only this pull request.
    pub ahead: u64,
}

/// The GitHub base that remains after a workspace leaves the queue.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct MergeQueueLeaveNotice {
    /// The display label of the base that the queue could not reset.
    pub base_branch: String,
}

/// Moves an entry's unit before another unit or to the end of its queue.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ReorderMergeQueue {
    /// A workspace in the next unit, or null to move to the end.
    pub before_workspace_id: Option<String>,
}
