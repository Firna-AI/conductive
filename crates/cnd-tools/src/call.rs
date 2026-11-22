//! Typed calls between the adapters and the HTTP client.

use serde::{Deserialize, Serialize};

use cnd_runner_interface::tools::{
    device::DeviceCommandInput,
    previews::OpenPreviewRequest,
    resources::AgentCreateSectionRequest,
    secrets::RunWithSecretsRequest,
    session_actions::{AgentCloseSessionRequest, AgentRenameSessionRequest},
    session_reads::{AgentListSessionsRequest, AgentReadSessionRequest},
    session_watches::AgentWatchSessionRequest,
    sessions::{AgentCreateSessionRequest, AgentSendMessageRequest},
    workspaces::{
        AgentCreateWorkspaceRequest, AgentListWorkspacesRequest, AgentMoveWorkspaceRequest,
        AgentRenameWorkspaceRequest,
    },
};

use crate::process::CommandInput;

/// The 27 public tool identities.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum Name {
    ListSecrets,
    RunWithSecrets,
    RunMacCommand,
    CreateWorkspace,
    ListWorkspaces,
    GetWorkspace,
    RenameWorkspace,
    MoveWorkspace,
    ArchiveWorkspace,
    ListRepositories,
    ListSections,
    ListModels,
    ListSessions,
    ReadSession,
    CreateSession,
    SendMessage,
    GetSession,
    RenameSession,
    CloseSession,
    StopSession,
    WatchSession,
    GetMessage,
    CreateSection,
    DeleteSection,
    ListPreviews,
    OpenPreview,
    ClosePreview,
}

/// Fully parsed domain input for one tool operation.
#[derive(Debug, Clone)]
pub(crate) enum Call {
    ListSecrets,
    RunWithSecrets(RunWithSecretsRequest, CommandInput),
    RunMacCommand(DeviceCommandInput),
    CreateWorkspace(AgentCreateWorkspaceRequest),
    ListWorkspaces(AgentListWorkspacesRequest),
    GetWorkspace(String),
    RenameWorkspace(String, AgentRenameWorkspaceRequest),
    MoveWorkspace(String, AgentMoveWorkspaceRequest),
    ArchiveWorkspace(String),
    ListRepositories,
    ListSections,
    ListModels,
    ListSessions(String, AgentListSessionsRequest),
    ReadSession(String, String, AgentReadSessionRequest),
    CreateSession(String, AgentCreateSessionRequest),
    SendMessage(String, String, AgentSendMessageRequest),
    GetSession(String, String),
    RenameSession(String, String, AgentRenameSessionRequest),
    CloseSession(String, String, AgentCloseSessionRequest),
    StopSession(String, String),
    WatchSession(String, String, AgentWatchSessionRequest),
    GetMessage(String, String, String),
    CreateSection(AgentCreateSectionRequest),
    DeleteSection(String),
    ListPreviews(String),
    OpenPreview(String, OpenPreviewRequest),
    ClosePreview(String, String),
}

impl Call {
    pub(crate) fn name(&self) -> Name {
        match self {
            Self::ListSecrets => Name::ListSecrets,
            Self::RunWithSecrets(..) => Name::RunWithSecrets,
            Self::RunMacCommand(..) => Name::RunMacCommand,
            Self::CreateWorkspace(..) => Name::CreateWorkspace,
            Self::ListWorkspaces(..) => Name::ListWorkspaces,
            Self::GetWorkspace(..) => Name::GetWorkspace,
            Self::RenameWorkspace(..) => Name::RenameWorkspace,
            Self::MoveWorkspace(..) => Name::MoveWorkspace,
            Self::ArchiveWorkspace(..) => Name::ArchiveWorkspace,
            Self::ListRepositories => Name::ListRepositories,
            Self::ListSections => Name::ListSections,
            Self::ListModels => Name::ListModels,
            Self::ListSessions(..) => Name::ListSessions,
            Self::ReadSession(..) => Name::ReadSession,
            Self::CreateSession(..) => Name::CreateSession,
            Self::SendMessage(..) => Name::SendMessage,
            Self::GetSession(..) => Name::GetSession,
            Self::RenameSession(..) => Name::RenameSession,
            Self::CloseSession(..) => Name::CloseSession,
            Self::StopSession(..) => Name::StopSession,
            Self::WatchSession(..) => Name::WatchSession,
            Self::GetMessage(..) => Name::GetMessage,
            Self::CreateSection(..) => Name::CreateSection,
            Self::DeleteSection(..) => Name::DeleteSection,
            Self::ListPreviews(..) => Name::ListPreviews,
            Self::OpenPreview(..) => Name::OpenPreview,
            Self::ClosePreview(..) => Name::ClosePreview,
        }
    }
}
