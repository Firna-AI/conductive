//! Metadata-only tool replies and the secret run request.

use serde::{Deserialize, Serialize};

use crate::process::CommandResult;

#[derive(Debug, Clone, Serialize)]
pub(crate) struct RunRequest {
    pub(crate) names: Vec<String>,
    pub(crate) command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct ListResponse {
    pub(crate) secrets: Vec<Secret>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct Secret {
    name: String,
    description: String,
    available: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub(crate) enum RunResult {
    Completed(CommandResult),
    #[serde(rename_all = "camelCase")]
    Pending {
        request_id: String,
        message: String,
    },
    #[serde(rename_all = "camelCase")]
    Denied {
        request_id: String,
        message: String,
    },
    #[serde(rename_all = "camelCase")]
    NotAnswered {
        request_id: String,
        message: String,
    },
}

impl RunResult {
    pub(crate) fn exit_code(&self) -> u8 {
        match self {
            Self::Completed(result) => result.exit_code,
            _ => 1,
        }
    }

    pub(crate) fn message(&self) -> Option<&str> {
        match self {
            Self::Completed(_) => None,
            Self::Pending { message, .. }
            | Self::Denied { message, .. }
            | Self::NotAnswered { message, .. } => Some(message),
        }
    }
}
