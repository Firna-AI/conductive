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

/// Maximum changed files in a complete changes report from a new runner.
pub const FILE_CHANGES_REPORT_MAX_FILES: u64 = 1_000;
