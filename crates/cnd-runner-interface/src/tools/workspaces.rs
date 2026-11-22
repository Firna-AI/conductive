//! Workspace tool request and reply contracts.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::agents::Effort;
use crate::api::Timestamp;
use crate::wire::ReadonlyVec;

use super::resources::AgentRequestModel;
use super::workspace_types::{Workspace, WorkspaceState};

/// AgentWorkspaceSummary wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentWorkspaceSummary {
    /// id.
    pub id: String,
    /// number.
    pub number: u64,
    /// link.
    pub link: String,
    /// name.
    pub name: Option<String>,
    /// branch.
    pub branch: String,
    /// state.
    pub state: WorkspaceState,
}

/// AgentCreateWorkspaceRequest wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentCreateWorkspaceRequest {
    /// repository id.
    pub repository_id: String,
    /// first message.
    pub first_message: String,
    /// Create the workspace branch from this branch. Omission uses the base or repository default.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub start_branch: Option<String>,
    /// Pull request target and Changes comparison branch. Omission uses the start or repository default.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub base_branch: Option<String>,
    /// model.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub model: Option<AgentRequestModel>,
    /// effort.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub effort: Option<Effort>,
    /// Explicit fast override. Omission creates at standard speed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub fast: Option<bool>,
    /// section id.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub section_id: Option<String>,
    /// Parent workspace for the new sub-workspace.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub parent_id: Option<String>,
    /// name.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub name: Option<String>,
    /// first session title.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub first_session_title: Option<String>,
    /// request id.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub request_id: Option<String>,
}

/// AgentCreateWorkspaceResponse wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentCreateWorkspaceResponse {
    /// workspace.
    pub workspace: Workspace,
    /// session id.
    pub session_id: String,
    /// session link.
    pub session_link: String,
    /// The saved initial turn, absent from replies of earlier Workers.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub turn_id: Option<String>,
    /// Notice about the section chosen for the workspace.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub notice: Option<String>,
}

/// AgentWorkspaceOwner wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentWorkspaceOwner {
    /// id.
    pub id: String,
    /// github login.
    pub github_login: String,
    /// display name.
    pub display_name: Option<String>,
}

/// AgentWorkspaceListEntry wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentWorkspaceListEntry {
    /// summary.
    #[serde(flatten)]
    pub summary: AgentWorkspaceSummary,
    /// Parent workspace, or null for a top-level workspace.
    pub parent_id: Option<String>,
    /// owner.
    pub owner: AgentWorkspaceOwner,
}

/// AgentListWorkspacesRequest wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentListWorkspacesRequest {
    /// owner id.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub owner_id: Option<String>,
    /// Filter by the direct parent workspace.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub parent_id: Option<String>,
    /// state.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub state: Option<WorkspaceState>,
    /// repository id.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub repository_id: Option<String>,
    /// query.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub query: Option<String>,
    /// updated since.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub updated_since: Option<Timestamp>,
    /// archived.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub archived: Option<bool>,
    /// Only removed workspaces when true. False or omission leaves them out.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub removed: Option<bool>,
    /// limit.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub limit: Option<u64>,
    /// offset.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub offset: Option<u64>,
}

/// AgentListWorkspacesResponse wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentListWorkspacesResponse {
    /// workspaces.
    #[ts(as = "ReadonlyVec<AgentWorkspaceListEntry>")]
    pub workspaces: Vec<AgentWorkspaceListEntry>,
    /// has more.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub has_more: Option<bool>,
}

/// AgentWorkspaceRepository wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentWorkspaceRepository {
    /// id.
    pub id: String,
    /// full name.
    pub full_name: String,
    /// default branch.
    pub default_branch: String,
}

/// AgentWorkspaceSection wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentWorkspaceSection {
    /// id.
    pub id: String,
    /// name.
    pub name: String,
}

/// AgentWorkspaceDetail wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentWorkspaceDetail {
    /// entry.
    #[serde(flatten)]
    pub entry: AgentWorkspaceListEntry,
    /// Parent entry, including an archived parent, or null.
    pub parent: Option<AgentWorkspaceListEntry>,
    /// Number of parent links, including archived parents.
    pub depth: u64,
    /// Direct sub-workspaces in creation order, including archived ones.
    #[ts(as = "ReadonlyVec<AgentWorkspaceListEntry>")]
    pub children: Vec<AgentWorkspaceListEntry>,
    /// repository.
    pub repository: AgentWorkspaceRepository,
    /// base branch.
    pub base_branch: String,
    /// section.
    pub section: AgentWorkspaceSection,
    /// created at.
    pub created_at: Timestamp,
    /// last activity at.
    pub last_activity_at: Timestamp,
    /// archived at.
    pub archived_at: Option<Timestamp>,
    /// restore until.
    pub restore_until: Option<Timestamp>,
    /// When the workspace left the list, 14 days after its archive. Null
    /// until then.
    pub removed_at: Option<Timestamp>,
}

/// AgentWorkspaceResponse wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentWorkspaceResponse {
    /// workspace.
    pub workspace: AgentWorkspaceDetail,
    /// Notice about a workspace write.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub notice: Option<String>,
}

/// AgentRenameWorkspaceRequest wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentRenameWorkspaceRequest {
    /// name.
    pub name: String,
}

/// AgentMoveWorkspaceRequest wire fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentMoveWorkspaceRequest {
    /// Destination section. Optional when the call gives a parent target.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub section_id: Option<String>,
    /// New parent workspace for the moved tree.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub parent_id: Option<String>,
    /// Move the tree to the top level when true.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub top_level: Option<bool>,
}
