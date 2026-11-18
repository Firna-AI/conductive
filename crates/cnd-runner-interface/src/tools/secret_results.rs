//! Printable secret command results, separate from raw Worker values.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::wire::ReadonlyVec;

/// Printable metadata for one secret, with its derived variable name.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct SecretListEntry {
    /// Exact lookup and approval name.
    pub name: String,
    /// What the secret is for.
    pub description: String,
    /// Whether the calling context already has access.
    pub available: bool,
    /// Shell variable that supplies its value to a command.
    pub environment_variable: String,
}

/// The enriched metadata-only list returned by CLI and MCP.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
pub struct ListSecretsResult {
    /// Worker entries with their locally derived variable names.
    #[ts(as = "ReadonlyVec<SecretListEntry>")]
    pub secrets: Vec<SecretListEntry>,
}

/// The filtered result of a child command.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    /// Filtered stdout, empty for an inherited CLI stream.
    pub stdout: String,
    /// Filtered stderr, empty for an inherited CLI stream.
    pub stderr: String,
    /// Exit status, with Unix signals represented as 128 plus the signal number.
    pub exit_code: u8,
}

/// A printable tool outcome, which can never contain raw Worker values.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub enum RunWithSecretsResult {
    /// The command ran and its streams were filtered.
    #[serde(rename_all = "camelCase")]
    Completed {
        /// Filtered process output and exit status.
        #[serde(flatten)]
        result: CommandResult,
        /// Exact requested names and their derived variable names.
        #[ts(type = "Record<string, string>")]
        environment_variables: BTreeMap<String, String>,
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

impl RunWithSecretsResult {
    /// The child's status, or failure when no command ran.
    pub fn exit_code(&self) -> u8 {
        match self {
            Self::Completed { result, .. } => result.exit_code,
            _ => 1,
        }
    }

    /// The Worker explanation when no command ran.
    pub fn message(&self) -> Option<&str> {
        match self {
            Self::Completed { .. } => None,
            Self::Pending { message, .. }
            | Self::Denied { message, .. }
            | Self::NotAnswered { message, .. } => Some(message),
        }
    }
}
