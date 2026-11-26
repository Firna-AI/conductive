//! Merge actions and member stack facts of the GitHub bar.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// The method that GitHub uses to merge a pull request.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum GitHubMergeMethod {
    /// Create a merge commit.
    Merge,
    /// Squash the commits before merging.
    Squash,
    /// Rebase the commits before merging.
    Rebase,
}

/// Starts a direct merge of the pull request shown in the GitHub bar.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct GitHubMergeRequest {
    /// The commit the member reviewed.
    pub head_sha: String,
    /// The merge method that the member selected.
    pub method: GitHubMergeMethod,
    /// The number of pull requests shown by Merge stack, when present.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub stack_count: Option<u64>,
}

/// Which org queues an open pull request below the current stack layer.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "kebab-case")]
pub enum GitHubStackQueue {
    /// A lower pull request is queued in the current org.
    SameOrg,
    /// A lower pull request is queued in another org.
    OtherOrg,
}

/// The pull requests that Merge stack would land.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
pub struct GitHubMergeStack {
    /// The target and the open pull requests below it in the stack.
    pub count: u64,
    /// The queue of a lower pull request, if there is one.
    pub queue: Option<GitHubStackQueue>,
}

/// Asks this org's queue to merge through an unqueued pull request.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct RequestQueueStackMerge {
    /// The pull request at the top of the requested merge.
    pub pull_number: u64,
    /// The commit the member reviewed.
    pub head_sha: String,
    /// The full count shown by Merge stack, including the target.
    pub stack_count: u64,
}
