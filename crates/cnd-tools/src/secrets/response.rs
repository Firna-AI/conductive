//! Decode values into a non-printable contract that cannot become a tool reply.

use std::collections::BTreeMap;

use serde::Deserialize;

use cnd_runner_interface::json::decoder;

use crate::error::{Error, Result};

use super::types::RunResult;

#[derive(Deserialize)]
#[serde(tag = "status", rename_all = "kebab-case")]
pub(crate) enum RunResponse {
    Allowed {
        values: BTreeMap<String, String>,
        grants: Vec<Grant>,
    },
    #[serde(rename_all = "camelCase")]
    Pending { request_id: String, message: String },
    #[serde(rename_all = "camelCase")]
    Denied { request_id: String, message: String },
    #[serde(rename_all = "camelCase")]
    NotAnswered { request_id: String, message: String },
}

#[derive(Deserialize)]
pub(crate) struct Grant {
    name: String,
    #[serde(rename = "grant")]
    _grant: GrantKind,
}

#[derive(Deserialize)]
#[serde(rename_all = "kebab-case")]
enum GrantKind {
    AllAgents,
    Workspace,
    Session,
    #[serde(rename = "15-minutes")]
    FifteenMinutes,
    WorkspaceValue,
}

pub(crate) fn parse(body: &str, names: &[String]) -> Result<RunResponse> {
    let response = match decoder::decode::<RunResponse>(body.as_bytes()) {
        Ok(response) => response,
        Err(_) => return Err(Error::Reply { mac: false }),
    };
    if let RunResponse::Allowed { values, grants } = &response {
        let valid = names.iter().all(|name| values.contains_key(name))
            && values.keys().all(|name| names.contains(name))
            && names
                .iter()
                .all(|name| grants.iter().any(|grant| &grant.name == name))
            && grants.iter().all(|grant| names.contains(&grant.name));
        if !valid {
            return Err(Error::Reply { mac: false });
        }
    }
    Ok(response)
}

impl RunResponse {
    pub(crate) fn into_result(self) -> Option<RunResult> {
        match self {
            Self::Allowed { .. } => None,
            Self::Pending {
                request_id,
                message,
            } => Some(RunResult::Pending {
                request_id,
                message,
            }),
            Self::Denied {
                request_id,
                message,
            } => Some(RunResult::Denied {
                request_id,
                message,
            }),
            Self::NotAnswered {
                request_id,
                message,
            } => Some(RunResult::NotAnswered {
                request_id,
                message,
            }),
        }
    }
}
