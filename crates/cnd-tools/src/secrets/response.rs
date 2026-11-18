//! Decode values into a non-printable contract that cannot become a tool reply.

use serde_json::Value;

use cnd_runner_interface::json::decoder;

use cnd_runner_interface::tools::secret_results::{
    ListSecretsResult, RunWithSecretsResult, SecretListEntry,
};
use cnd_runner_interface::tools::secrets::{ListSecretsResponse, RunWithSecretsResponse};

use crate::error::{Error, Result};

use super::environment::variable_name;

pub(crate) fn list(value: Value) -> Result<ListSecretsResult> {
    let response = match serde_json::from_value::<ListSecretsResponse>(value) {
        Ok(response) => response,
        Err(_) => return Err(Error::Reply { mac: false }),
    };
    Ok(ListSecretsResult {
        secrets: response
            .secrets
            .into_iter()
            .map(|secret| SecretListEntry {
                environment_variable: variable_name(&secret.name),
                name: secret.name,
                description: secret.description,
                available: secret.available,
            })
            .collect(),
    })
}

pub(crate) fn parse(body: &str, names: &[String]) -> Result<RunWithSecretsResponse> {
    let response = match decoder::decode::<RunWithSecretsResponse>(body.as_bytes()) {
        Ok(response) => response,
        Err(_) => return Err(Error::Reply { mac: false }),
    };
    if let RunWithSecretsResponse::Allowed { values, grants } = &response {
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

pub(crate) fn into_result(response: RunWithSecretsResponse) -> Option<RunWithSecretsResult> {
    match response {
        RunWithSecretsResponse::Allowed { .. } => None,
        RunWithSecretsResponse::Pending {
            request_id,
            message,
        } => Some(RunWithSecretsResult::Pending {
            request_id,
            message,
        }),
        RunWithSecretsResponse::Denied {
            request_id,
            message,
        } => Some(RunWithSecretsResult::Denied {
            request_id,
            message,
        }),
        RunWithSecretsResponse::NotAnswered {
            request_id,
            message,
        } => Some(RunWithSecretsResult::NotAnswered {
            request_id,
            message,
        }),
    }
}
