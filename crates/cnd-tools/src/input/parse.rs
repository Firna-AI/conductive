//! Parse untrusted adapter fields into the shared typed requests.

use serde::de::DeserializeOwned;
use serde_json::{Map, Value};

use cnd_runner_interface::tools::previews::OpenPreviewRequest;
use cnd_runner_interface::tools::resources::AgentCreateSectionRequest;
use cnd_runner_interface::tools::session_actions::{
    AgentCloseSessionRequest, AgentRenameSessionRequest,
};
use cnd_runner_interface::tools::workspaces::{
    AgentMoveWorkspaceRequest, AgentRenameWorkspaceRequest,
};

use crate::call::{Call, Name};
use crate::error::{Error, ErrorResultExt, InputError, Result};
use crate::process::CommandInput;
use crate::secrets::input;

use super::{lists, watches, writes};

pub(crate) fn parse(name: Name, fields: &Map<String, Value>, request_id: &str) -> Result<Call> {
    let workspace =
        || optional_text(fields, "workspaceId").map(|id| id.unwrap_or_else(|| "current".into()));
    let session = || text(fields, "sessionId");
    Ok(match name {
        Name::ListSecrets => Call::ListSecrets,
        Name::RunWithSecrets => {
            let input = input::parse(fields)?;
            let command = CommandInput::Capture(input.command.clone());
            Call::RunWithSecrets(input, command)
        }
        Name::RunMacCommand => Call::RunMacCommand(writes::mac(fields, request_id)?),
        Name::CreateWorkspace => Call::CreateWorkspace(writes::workspace(fields, request_id)?),
        Name::ListWorkspaces => Call::ListWorkspaces(lists::workspaces(fields)?),
        Name::GetWorkspace => Call::GetWorkspace(workspace()?),
        Name::RenameWorkspace => Call::RenameWorkspace(
            workspace()?,
            AgentRenameWorkspaceRequest {
                name: text(fields, "name")?,
            },
        ),
        Name::MoveWorkspace => Call::MoveWorkspace(workspace()?, move_workspace(fields)?),
        Name::ArchiveWorkspace => Call::ArchiveWorkspace(workspace()?),
        Name::ListRepositories => Call::ListRepositories,
        Name::ListSections => Call::ListSections,
        Name::ListModels => Call::ListModels,
        Name::ListSessions => Call::ListSessions(workspace()?, lists::sessions(fields)?),
        Name::ReadSession => {
            Call::ReadSession(workspace()?, session()?, lists::transcript(fields)?)
        }
        Name::CreateSession => {
            Call::CreateSession(workspace()?, writes::session(fields, request_id)?)
        }
        Name::SendMessage => {
            Call::SendMessage(workspace()?, session()?, writes::send(fields, request_id)?)
        }
        Name::GetSession => Call::GetSession(workspace()?, session()?),
        Name::RenameSession => Call::RenameSession(
            workspace()?,
            session()?,
            AgentRenameSessionRequest {
                title: text(fields, "title")?,
            },
        ),
        Name::CloseSession => {
            let stop_running_turn = match fields.get("stopRunningTurn") {
                None => None,
                Some(Value::Bool(flag)) => Some(*flag),
                _ => return Err(Error::Input(InputError::Close)),
            };
            Call::CloseSession(
                workspace()?,
                session()?,
                AgentCloseSessionRequest { stop_running_turn },
            )
        }
        Name::StopSession => Call::StopSession(workspace()?, session()?),
        Name::WatchSession => Call::WatchSession(workspace()?, session()?, watches::parse(fields)?),
        Name::GetMessage => Call::GetMessage(workspace()?, session()?, text(fields, "messageId")?),
        Name::CreateSection => Call::CreateSection(AgentCreateSectionRequest {
            name: text(fields, "name")?,
        }),
        Name::DeleteSection => Call::DeleteSection(text(fields, "sectionId")?),
        Name::ListPreviews => Call::ListPreviews(workspace()?),
        Name::OpenPreview => {
            let port = match fields.get("port").and_then(whole_number) {
                Some(port) if (1..=65535).contains(&port) => port as u16,
                _ => return Err(Error::Input(InputError::Port)),
            };
            Call::OpenPreview(workspace()?, OpenPreviewRequest { port })
        }
        Name::ClosePreview => Call::ClosePreview(workspace()?, text(fields, "previewId")?),
    })
}

fn move_workspace(fields: &Map<String, Value>) -> Result<AgentMoveWorkspaceRequest> {
    let section_id = optional_text(fields, "sectionId")?;
    let parent_id = optional_text(fields, "parentId")?;
    let top_level = match fields.get("topLevel") {
        None => None,
        Some(Value::Bool(value)) => Some(*value),
        _ => return Err(Error::Input(InputError::Required)),
    };
    if (parent_id.is_some() && top_level == Some(true))
        || (section_id.is_none() && parent_id.is_none() && top_level != Some(true))
    {
        return Err(Error::Input(InputError::Required));
    }
    Ok(AgentMoveWorkspaceRequest {
        section_id,
        parent_id,
        top_level,
    })
}

pub(super) fn text(fields: &Map<String, Value>, key: &str) -> Result<String> {
    match fields.get(key).and_then(Value::as_str) {
        Some(value) if !value.trim().is_empty() => Ok(value.into()),
        _ => Err(Error::Input(InputError::Required)),
    }
}

fn optional_text(fields: &Map<String, Value>, key: &str) -> Result<Option<String>> {
    if fields.contains_key(key) {
        Ok(Some(text(fields, key)?))
    } else {
        Ok(None)
    }
}

pub(super) fn whole_number(value: &Value) -> Option<i64> {
    let number = value.as_f64()?;
    (number.is_finite() && number.fract() == 0.0 && number.abs() <= 9_007_199_254_740_991.0)
        .then_some(number as i64)
}

pub(super) fn decode<T: DeserializeOwned>(mut fields: Map<String, Value>) -> Result<T> {
    for value in fields.values_mut() {
        if let Some(number) = whole_number(value) {
            *value = Value::from(number);
        }
    }
    serde_json::from_value(Value::Object(fields)).internal()
}

#[cfg(test)]
#[path = "../_tests_/input_tests.rs"]
mod input_tests;

#[cfg(test)]
#[path = "../_tests_/move_workspace_tests.rs"]
mod move_workspace_tests;
