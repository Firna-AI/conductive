//! Parse the Worker secret request without imposing extra field limits.

use serde_json::{Map, Value};

use crate::error::{Error, InputError, Result};

use super::types::RunRequest;

pub(crate) fn parse(fields: &Map<String, Value>) -> Result<RunRequest> {
    let invalid = || Error::Input(InputError::Secrets);
    let names = fields
        .get("names")
        .and_then(Value::as_array)
        .ok_or_else(invalid)?;
    if names.is_empty() {
        return Err(invalid());
    }
    let names = names
        .iter()
        .map(|name| {
            name.as_str()
                .filter(|name| !name.is_empty())
                .map(String::from)
                .ok_or_else(invalid)
        })
        .collect::<Result<_>>()?;
    let command = fields
        .get("command")
        .and_then(Value::as_str)
        .ok_or_else(invalid)?
        .into();
    let reason = fields
        .get("reason")
        .map(|reason| reason.as_str().map(String::from).ok_or_else(invalid))
        .transpose()?;
    Ok(RunRequest {
        names,
        command,
        reason,
    })
}
