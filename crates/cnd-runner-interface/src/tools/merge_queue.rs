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
    /// A pull request earlier in the queue holds the merge.
    LowerLayer,
    /// The queuer's GitHub token stopped working.
    Token,
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
    /// The current step.
    pub state: MergeQueueEntryState,
    /// The condition that the entry waits for, if any.
    pub wait: Option<MergeQueueWait>,
}

/// Moves an entry's unit before another unit or to the end of its queue.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ReorderMergeQueue {
    /// A workspace in the next unit, or null to move to the end.
    pub before_workspace_id: Option<String>,
}
