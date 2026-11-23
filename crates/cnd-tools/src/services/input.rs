//! Structured MCP inputs preserve exact service names and explicit values.

use std::collections::BTreeMap;

use cnd_runner_interface::services::control::ServiceControlAction;
use cnd_runner_interface::services::local::{
    ServiceDefinition, ServicePortWait, ServiceStartRequest,
};
use serde::Deserialize;
use serde_json::{Map, Value};

use crate::error::{Error, InputError, Result};

use super::tools::{LocalContext, ServiceName};

pub(super) enum Intent {
    Start(ServiceStartRequest),
    List(String),
    Control {
        name: String,
        action: ServiceControlAction,
        request_id: String,
    },
    Logs {
        name: String,
        request_id: String,
    },
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Start {
    name: String,
    command: Vec<String>,
    folder: Option<String>,
    #[serde(default)]
    env: BTreeMap<String, String>,
    wait_for_port: Option<ServicePortWait>,
    request_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Named {
    name: String,
    request_id: Option<String>,
}

pub(super) fn parse(
    name: ServiceName,
    fields: Map<String, Value>,
    id: &str,
    context: &dyn LocalContext,
) -> Result<Intent> {
    if matches!(name, ServiceName::ListServices) {
        return Ok(Intent::List(id.into()));
    }
    if matches!(name, ServiceName::StartService) {
        let input: Start = match serde_json::from_value(Value::Object(fields)) {
            Ok(value) => value,
            Err(_) => return Err(Error::Input(InputError::ServiceOptions)),
        };
        return Ok(Intent::Start(ServiceStartRequest {
            request_id: input.request_id.unwrap_or_else(|| id.into()),
            name: input.name,
            definition: ServiceDefinition {
                command: input.command,
                folder: match input.folder {
                    Some(folder) => folder,
                    None => context.folder()?,
                },
                env: input.env,
            },
            originating_turn_id: context.turn_id(),
            wait_for_port: input.wait_for_port,
        }));
    }
    let input: Named = match serde_json::from_value(Value::Object(fields)) {
        Ok(value) => value,
        Err(_) => return Err(Error::Input(InputError::ServiceOptions)),
    };
    let request_id = input.request_id.unwrap_or_else(|| id.into());
    Ok(match name {
        ServiceName::ReadServiceLogs => Intent::Logs {
            name: input.name,
            request_id,
        },
        ServiceName::StopService => Intent::Control {
            name: input.name,
            action: ServiceControlAction::Stop,
            request_id,
        },
        _ => Intent::Control {
            name: input.name,
            action: ServiceControlAction::Restart,
            request_id,
        },
    })
}
