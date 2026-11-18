//! Legacy Worker secret contracts, with values confined to a non-printable reply.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::wire::ReadonlyVec;

/// Metadata for one org secret, without its value.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ToolSecret {
    /// Exact lookup and approval name.
    pub name: String,
    /// What the secret is for.
    pub description: String,
    /// Whether the calling context already has access.
    pub available: bool,
}

/// Metadata-only Worker list response, also accepted from older Workers.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ListSecretsResponse {
    /// Secrets in the order supplied by the Worker.
    #[ts(as = "ReadonlyVec<ToolSecret>")]
    pub secrets: Vec<ToolSecret>,
}

/// The request sent to the Worker before the tool starts a command.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct RunWithSecretsRequest {
    /// Exact requested secret names.
    #[ts(as = "ReadonlyVec<String>")]
    pub names: Vec<String>,
    /// Command description used by approval and audit records.
    pub command: String,
    /// Optional reason for access.
    #[serde(skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub reason: Option<String>,
}

/// The source of access for one name of a run.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "kebab-case")]
pub enum SecretGrant {
    /// Org-wide access.
    AllAgents,
    /// Workspace pre-approval.
    Workspace,
    /// Session approval.
    Session,
    /// A temporary value for fifteen minutes.
    #[serde(rename = "15-minutes")]
    FifteenMinutes,
    /// A value supplied for this workspace.
    WorkspaceValue,
}

/// Metadata describing the grant used for one requested secret.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct SecretRunGrant {
    /// Exact secret name.
    pub name: String,
    /// Source of access.
    pub grant: SecretGrant,
}

/// Value-bearing Worker response. It has no serializer or diagnostic output.
#[derive(Deserialize, TS)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum RunWithSecretsResponse {
    /// Values for the exact requested names only.
    Allowed {
        /// Raw values that may only enter the command environment.
        #[ts(type = "Record<string, string>")]
        values: BTreeMap<String, String>,
        /// Access metadata for each requested name.
        #[ts(as = "ReadonlyVec<SecretRunGrant>")]
        grants: Vec<SecretRunGrant>,
    },
    /// An approval is still open.
    #[serde(rename_all = "camelCase")]
    Pending {
        /// Approval request identifier.
        request_id: String,
        /// Value-free explanation.
        message: String,
    },
    /// A member denied access.
    #[serde(rename_all = "camelCase")]
    Denied {
        /// Approval request identifier.
        request_id: String,
        /// Value-free explanation.
        message: String,
    },
    /// The request ended without access.
    #[serde(rename_all = "camelCase")]
    NotAnswered {
        /// Approval request identifier.
        request_id: String,
        /// Value-free explanation.
        message: String,
    },
}
