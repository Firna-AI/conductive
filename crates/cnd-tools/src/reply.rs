//! Typed reply decoding removes unknown fields before either adapter sees them.

use serde::Serialize;
use serde_json::Value;

use cnd_runner_interface::json::decoder;
use cnd_runner_interface::services::local::ServiceLocalResponse;
use cnd_runner_interface::tools::device::{DeviceCommandResponse, DeviceCommandState};
use cnd_runner_interface::tools::previews::{
    AgentClosePreviewResponse, AgentListPreviewsResponse, AgentOpenPreviewResponse,
};
use cnd_runner_interface::tools::resources::{
    AgentCreateSectionResponse, AgentDeleteSectionResponse, AgentListModelsResponse,
    AgentListRepositoriesResponse, AgentListSectionsResponse,
};
use cnd_runner_interface::tools::secret_results::{ListSecretsResult, RunWithSecretsResult};
use cnd_runner_interface::tools::session_actions::{
    AgentGetMessageResponse, AgentSessionResponse, AgentStopSessionResponse,
};
use cnd_runner_interface::tools::session_reads::{
    AgentListSessionsResponse, AgentReadSessionResponse,
};
use cnd_runner_interface::tools::session_watches::AgentWatchSessionResponse;
use cnd_runner_interface::tools::sessions::{AgentCreateSessionResponse, AgentSendMessageResponse};
use cnd_runner_interface::tools::workspaces::{
    AgentCreateWorkspaceResponse, AgentListWorkspacesResponse, AgentWorkspaceResponse,
};

use crate::call::Name;
use crate::error::{Error, ErrorResultExt, Result};
use crate::reply_validation::{cap_output, mark_member_author, normalize_paths, valid};
use crate::secrets::response;
use crate::services::tools;

#[derive(Debug, Clone, Serialize)]
#[serde(untagged)]
pub(crate) enum Reply {
    Services(ServiceLocalResponse),
    ListSecrets(ListSecretsResult),
    RunWithSecrets(RunWithSecretsResult),
    RunMacCommand(DeviceCommandResponse),
    CreateWorkspace(AgentCreateWorkspaceResponse),
    ListWorkspaces(AgentListWorkspacesResponse),
    GetWorkspace(AgentWorkspaceResponse),
    RenameWorkspace(AgentWorkspaceResponse),
    MoveWorkspace(AgentWorkspaceResponse),
    ArchiveWorkspace(AgentWorkspaceResponse),
    ListRepositories(AgentListRepositoriesResponse),
    ListSections(AgentListSectionsResponse),
    ListModels(AgentListModelsResponse),
    ListSessions(AgentListSessionsResponse),
    ReadSession(AgentReadSessionResponse),
    CreateSession(AgentCreateSessionResponse),
    SendMessage(AgentSendMessageResponse),
    GetSession(AgentSessionResponse),
    RenameSession(AgentSessionResponse),
    CloseSession(AgentSessionResponse),
    StopSession(AgentStopSessionResponse),
    WatchSession(AgentWatchSessionResponse),
    GetMessage(AgentGetMessageResponse),
    CreateSection(AgentCreateSectionResponse),
    DeleteSection(AgentDeleteSectionResponse),
    ListPreviews(AgentListPreviewsResponse),
    OpenPreview(AgentOpenPreviewResponse),
    ClosePreview(AgentClosePreviewResponse),
}

impl Reply {
    pub(crate) fn failed(&self) -> bool {
        match self {
            Self::Services(reply) => tools::failed(reply),
            Self::RunWithSecrets(value) => value.exit_code() != 0,
            Self::RunMacCommand(value) => {
                value.request.state != DeviceCommandState::Completed
                    || value
                        .request
                        .result
                        .as_ref()
                        .is_none_or(|result| result.exit_code != Some(0))
            }
            _ => false,
        }
    }
    pub(crate) fn pending_mac(&self) -> Option<&str> {
        match self {
            Self::RunMacCommand(value)
                if matches!(
                    value.request.state,
                    DeviceCommandState::Waiting | DeviceCommandState::Running
                ) =>
            {
                Some(&value.request.request_key)
            }
            _ => None,
        }
    }
}

pub(crate) fn parse(name: Name, body: &str) -> Result<Reply> {
    let mac = name == Name::RunMacCommand;
    let mut value: Value = match decoder::decode(body.as_bytes()) {
        Ok(value) => value,
        Err(_) => return Err(Error::Reply { mac }),
    };
    normalize_paths(&mut value);
    if name == Name::GetMessage {
        mark_member_author(&mut value);
    }
    if name == Name::ListSecrets {
        return response::list(value).map(Reply::ListSecrets);
    }
    let source = value.clone();
    let parsed =
        match name {
            Name::ListSecrets => return Err(Error::Reply { mac }),
            Name::RunWithSecrets => return Err(Error::Reply { mac }),
            Name::RunMacCommand => {
                serde_json::from_value::<DeviceCommandResponse>(value).map(Reply::RunMacCommand)
            }
            Name::CreateWorkspace => serde_json::from_value::<AgentCreateWorkspaceResponse>(value)
                .map(Reply::CreateWorkspace),
            Name::ListWorkspaces => serde_json::from_value::<AgentListWorkspacesResponse>(value)
                .map(Reply::ListWorkspaces),
            Name::GetWorkspace => {
                serde_json::from_value::<AgentWorkspaceResponse>(value).map(Reply::GetWorkspace)
            }
            Name::RenameWorkspace => {
                serde_json::from_value::<AgentWorkspaceResponse>(value).map(Reply::RenameWorkspace)
            }
            Name::MoveWorkspace => {
                serde_json::from_value::<AgentWorkspaceResponse>(value).map(Reply::MoveWorkspace)
            }
            Name::ArchiveWorkspace => {
                serde_json::from_value::<AgentWorkspaceResponse>(value).map(Reply::ArchiveWorkspace)
            }
            Name::ListRepositories => {
                serde_json::from_value::<AgentListRepositoriesResponse>(value)
                    .map(Reply::ListRepositories)
            }
            Name::ListSections => {
                serde_json::from_value::<AgentListSectionsResponse>(value).map(Reply::ListSections)
            }
            Name::ListModels => {
                serde_json::from_value::<AgentListModelsResponse>(value).map(Reply::ListModels)
            }
            Name::ListSessions => {
                serde_json::from_value::<AgentListSessionsResponse>(value).map(Reply::ListSessions)
            }
            Name::ReadSession => {
                serde_json::from_value::<AgentReadSessionResponse>(value).map(Reply::ReadSession)
            }
            Name::CreateSession => serde_json::from_value::<AgentCreateSessionResponse>(value)
                .map(Reply::CreateSession),
            Name::SendMessage => {
                serde_json::from_value::<AgentSendMessageResponse>(value).map(Reply::SendMessage)
            }
            Name::GetSession => {
                serde_json::from_value::<AgentSessionResponse>(value).map(Reply::GetSession)
            }
            Name::RenameSession => {
                serde_json::from_value::<AgentSessionResponse>(value).map(Reply::RenameSession)
            }
            Name::CloseSession => {
                serde_json::from_value::<AgentSessionResponse>(value).map(Reply::CloseSession)
            }
            Name::StopSession => {
                serde_json::from_value::<AgentStopSessionResponse>(value).map(Reply::StopSession)
            }
            Name::WatchSession => {
                serde_json::from_value::<AgentWatchSessionResponse>(value).map(Reply::WatchSession)
            }
            Name::GetMessage => {
                serde_json::from_value::<AgentGetMessageResponse>(value).map(Reply::GetMessage)
            }
            Name::CreateSection => serde_json::from_value::<AgentCreateSectionResponse>(value)
                .map(Reply::CreateSection),
            Name::DeleteSection => serde_json::from_value::<AgentDeleteSectionResponse>(value)
                .map(Reply::DeleteSection),
            Name::ListPreviews => {
                serde_json::from_value::<AgentListPreviewsResponse>(value).map(Reply::ListPreviews)
            }
            Name::OpenPreview => {
                serde_json::from_value::<AgentOpenPreviewResponse>(value).map(Reply::OpenPreview)
            }
            Name::ClosePreview => {
                serde_json::from_value::<AgentClosePreviewResponse>(value).map(Reply::ClosePreview)
            }
        };
    match parsed {
        Ok(mut reply) => {
            let canonical = serde_json::to_value(&reply).internal()?;
            if !valid(&canonical, &source, "") {
                return Err(Error::Reply { mac });
            }
            cap_output(&mut reply);
            Ok(reply)
        }
        Err(_) => Err(Error::Reply { mac }),
    }
}
