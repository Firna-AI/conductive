//! FileChanges wire contracts.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::file_tree::RunnerFileRevisionPart;
use crate::wire::ReadonlyVec;

/// ChangedFile wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ChangedFile {
    /// path.
    pub path: String,
    /// displayPath.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub display_path: Option<String>,
    /// previousPath.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub previous_path: Option<String>,
    /// previousDisplayPath.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub previous_display_path: Option<String>,
    /// change.
    pub change: ChangeKind,
    /// added.
    #[ts(type = "number")]
    pub added: u64,
    /// removed.
    #[ts(type = "number")]
    pub removed: u64,
}

/// ChangeKind wire values.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
pub enum ChangeKind {
    /// added.
    #[serde(rename = "added")]
    Added,
    /// modified.
    #[serde(rename = "modified")]
    Modified,
    /// deleted.
    #[serde(rename = "deleted")]
    Deleted,
    /// renamed.
    #[serde(rename = "renamed")]
    Renamed,
    /// untracked.
    #[serde(rename = "untracked")]
    Untracked,
}

/// Concatenate files in part order. Each path occurs once in the full list.
/// Every part repeats the same base branch, status counts, and totals.
/// The summary counts the listed files across all parts.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct RunnerChangesPart {
    /// Shared wire fields.
    #[serde(flatten)]
    pub changes_response: ChangesResponse,
    /// Shared wire fields.
    #[serde(flatten)]
    pub runner_file_revision_part: RunnerFileRevisionPart,
}

/// ChangesResponseSummary wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ChangesResponseSummary {
    /// files.
    #[ts(type = "number")]
    pub files: u64,
    /// added.
    #[ts(type = "number")]
    pub added: u64,
    /// removed.
    #[ts(type = "number")]
    pub removed: u64,
}

/// A complete changes report with separate totals for listed and omitted files.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ChangesResponse {
    /// baseBranch.
    pub base_branch: String,
    /// displayBaseBranch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub display_base_branch: Option<String>,
    /// Current-branch commits held by no remote branch. Older runners omit it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    #[ts(type = "number")]
    pub unpushed_commits: Option<u64>,
    /// Raw status entries, including untracked files. Older runners omit it.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    #[ts(type = "number")]
    pub uncommitted_file_count: Option<u64>,
    /// Listed changes.
    #[ts(as = "ReadonlyVec<BranchChangedFile>")]
    pub files: Vec<BranchChangedFile>,
    /// File and line totals for the listed changes.
    pub summary: ChangesResponseSummary,
    /// File and line totals for the omitted changes.
    /// Absent when the count is unknown, as from an older runner.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub omitted: Option<ChangesResponseSummary>,
}

/// A complete changes list for a browser read or a `changes.updated` event.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct BrowserChangesResponse {
    /// Shared fields of the complete list.
    #[serde(flatten)]
    pub changes: ChangesResponse,
    /// The changes revision of the runner stream.
    /// Absent when unknown, as from an older Worker or runner.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional, type = "number")]
    pub revision: Option<u64>,
}

/// Includes changes in the index and working tree, also untracked files.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct BranchChangedFile {
    /// Shared changed-file fields.
    #[serde(flatten)]
    pub changed_file: ChangedFile,
    /// Includes changes in the index and working tree, also untracked files.
    pub uncommitted: bool,
}

/// The complete header and row changes for the next changes revision.
/// The total number of removes and upserts is at most `FILE_CHANGES_DELTA_MAX_CHANGES`.
/// The event must also fit within `FILE_EVENT_MAX_BYTES`.
/// Remove each removed path and each upserted path from the previous list.
/// Then insert the upserts in ascending `index` order.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ChangesDelta {
    /// The next changes revision of the runner stream.
    #[ts(type = "number")]
    pub revision: u64,
    /// The base branch of the new list.
    pub base_branch: String,
    /// The filtered display label of the base branch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub display_base_branch: Option<String>,
    /// Current-branch commits held by no remote branch.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional, type = "number")]
    pub unpushed_commits: Option<u64>,
    /// Raw status entries, including untracked files.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional, type = "number")]
    pub uncommitted_file_count: Option<u64>,
    /// File and line totals for the listed changes after the delta.
    pub summary: ChangesResponseSummary,
    /// File and line totals for the omitted changes after the delta.
    pub omitted: ChangesResponseSummary,
    /// Paths to remove from the previous list.
    #[ts(as = "ReadonlyVec<String>")]
    pub removes: Vec<String>,
    /// New or changed rows in ascending index order.
    #[ts(as = "ReadonlyVec<ChangesDeltaUpsert>")]
    pub upserts: Vec<ChangesDeltaUpsert>,
}

/// A changed-file row and its position in the new list.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct ChangesDeltaUpsert {
    /// Zero-based index of the row in the new list.
    #[ts(type = "number")]
    pub index: u64,
    /// The row to insert at this index.
    pub file: BranchChangedFile,
}

/// Maximum removes and upserts together in one changes delta.
pub const FILE_CHANGES_DELTA_MAX_CHANGES: u64 = 512;

/// Maximum changed files in a complete changes report from a new runner.
pub const FILE_CHANGES_REPORT_MAX_FILES: u64 = 1_000;
