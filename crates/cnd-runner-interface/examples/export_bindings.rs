//! Regenerate the shared TypeScript runner protocol types.

use std::{env, error::Error, fs, path::Path, process::Command};

use ts_rs::{Config, TS};

use cnd_runner_interface::{
    agents, api, chat_events, commit_author, file_changes, file_tree, files, messages, ports,
    preview_ingress, provider_events, runner, runner_commands, runner_credentials, runner_files,
    runner_handshake, runner_repository, runner_skills, sdk_helper, sdk_helper_options, services,
    skills, tools, workspaces,
};

fn main() -> Result<(), Box<dyn Error>> {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../..");
    let output = root.join("src/shared/generated");
    if output.exists() {
        fs::remove_dir_all(&output)?;
    }
    let cfg = Config::new()
        .with_out_dir(output)
        .with_large_int("number")
        .with_import_extension(Some("js"));
    agents::Agent::export_all(&cfg)?;
    agents::AgentChoice::export_all(&cfg)?;
    agents::Effort::export_all(&cfg)?;
    api::Timestamp::export_all(&cfg)?;
    chat_events::AgentChatEvent::export_all(&cfg)?;
    chat_events::ToolCall::export_all(&cfg)?;
    chat_events::TurnEndReason::export_all(&cfg)?;
    chat_events::TurnSpeed::export_all(&cfg)?;
    chat_events::TurnEventContext::export_all(&cfg)?;
    commit_author::CommitAuthor::export_all(&cfg)?;
    file_changes::BranchChangedFile::export_all(&cfg)?;
    file_changes::BrowserChangesResponse::export_all(&cfg)?;
    file_changes::ChangeKind::export_all(&cfg)?;
    file_changes::ChangedFile::export_all(&cfg)?;
    file_changes::ChangesResponse::export_all(&cfg)?;
    file_changes::RunnerChangesPart::export_all(&cfg)?;
    file_tree::FileEntry::export_all(&cfg)?;
    file_tree::FileTreeChange::export_all(&cfg)?;
    file_tree::FileTreeDelta::export_all(&cfg)?;
    file_tree::FileTreeResponse::export_all(&cfg)?;
    file_tree::RunnerFileEvent::export_all(&cfg)?;
    file_tree::RunnerFileRevisionPart::export_all(&cfg)?;
    file_tree::RunnerFileTreePart::export_all(&cfg)?;
    files::DiffResponse::export_all(&cfg)?;
    files::FileResponse::export_all(&cfg)?;
    messages::Attachment::export_all(&cfg)?;
    messages::MessageSender::export_all(&cfg)?;
    messages::UserMessage::export_all(&cfg)?;
    ports::ListeningPort::export_all(&cfg)?;
    ports::RunnerPortsUpdated::export_all(&cfg)?;
    services::app::ServiceCatalogue::export_all(&cfg)?;
    services::app::ServiceLogResponse::export_all(&cfg)?;
    services::control::ServiceControlResult::export_all(&cfg)?;
    services::local::ServiceLocalRequest::export_all(&cfg)?;
    services::local::ServiceLocalResponse::export_all(&cfg)?;
    services::process::ServiceIdentity::export_all(&cfg)?;
    services::process::ServiceSummary::export_all(&cfg)?;
    services::reports::ServiceReport::export_all(&cfg)?;
    services::transport::RunnerServiceMessage::export_all(&cfg)?;
    services::transport::RunnerServiceCommand::export_all(&cfg)?;
    skills::AgentSkill::export_all(&cfg)?;
    skills::RunnerSkillsUpdated::export_all(&cfg)?;
    skills::SkillLists::export_all(&cfg)?;
    skills::SkillsUpdated::export_all(&cfg)?;
    preview_ingress::PreviewIngressIdentity::export_all(&cfg)?;
    runner::RunnerEvent::export_all(&cfg)?;
    runner_commands::RunnerAttachment::export_all(&cfg)?;
    runner_commands::RunnerBranches::export_all(&cfg)?;
    runner_commands::RunnerCapabilities::export_all(&cfg)?;
    runner_commands::RunnerChangeModel::export_all(&cfg)?;
    runner_commands::RunnerCommand::export_all(&cfg)?;
    runner_commands::RunnerControlCommand::export_all(&cfg)?;
    runner_commands::RunnerInterrupt::export_all(&cfg)?;
    runner_commands::RunnerMessageDuringTurn::export_all(&cfg)?;
    runner_commands::RunnerReportKind::export_all(&cfg)?;
    runner_commands::RunnerReportRefresh::export_all(&cfg)?;
    runner_commands::RunnerTurn::export_all(&cfg)?;
    runner_credentials::RunnerCodexAccount::export_all(&cfg)?;
    runner_credentials::RunnerLogin::export_all(&cfg)?;
    runner_credentials::RunnerLoginKind::export_all(&cfg)?;
    runner_credentials::RunnerTurnCredential::export_all(&cfg)?;
    runner_files::RunnerDiffResult::export_all(&cfg)?;
    runner_files::RunnerFileCommand::export_all(&cfg)?;
    runner_files::RunnerFileError::export_all(&cfg)?;
    runner_files::RunnerFileResponse::export_all(&cfg)?;
    runner_files::RunnerFileResult::export_all(&cfg)?;
    runner_files::RunnerReadDiff::export_all(&cfg)?;
    runner_files::RunnerReadFile::export_all(&cfg)?;
    runner_handshake::RunnerConfirm::export_all(&cfg)?;
    runner_handshake::RunnerEventEnvelope::export_all(&cfg)?;
    runner_handshake::RunnerHello::export_all(&cfg)?;
    runner_handshake::RunnerProtocolVersion::export_all(&cfg)?;
    runner_handshake::RunnerResend::export_all(&cfg)?;
    runner_handshake::RunnerToWorkspace::export_all(&cfg)?;
    runner_handshake::RunnerWelcome::export_all(&cfg)?;
    runner_handshake::WorkspaceToRunner::export_all(&cfg)?;
    runner_repository::RunnerRepository::export_all(&cfg)?;
    runner_repository::RunnerRepositoryMove::export_all(&cfg)?;
    runner_repository::RunnerRepositoryMoveRefusal::export_all(&cfg)?;
    runner_repository::RunnerRepositoryMoveRefused::export_all(&cfg)?;
    runner_skills::RunnerReadSkill::export_all(&cfg)?;
    workspaces::StartStep::export_all(&cfg)?;
    workspaces::WorkspaceStart::export_all(&cfg)?;
    tools::device::DeviceCommandInput::export_all(&cfg)?;
    tools::device::DeviceCommandResponse::export_all(&cfg)?;
    tools::secrets::ListSecretsResponse::export_all(&cfg)?;
    tools::secrets::RunWithSecretsRequest::export_all(&cfg)?;
    tools::secrets::RunWithSecretsResponse::export_all(&cfg)?;
    tools::secret_results::RunWithSecretsResult::export_all(&cfg)?;
    tools::secret_results::ListSecretsResult::export_all(&cfg)?;
    tools::previews::OpenPreviewRequest::export_all(&cfg)?;
    tools::previews::AgentListPreviewsResponse::export_all(&cfg)?;
    tools::previews::AgentOpenPreviewResponse::export_all(&cfg)?;
    tools::previews::AgentClosePreviewResponse::export_all(&cfg)?;
    tools::resources::AgentListRepositoriesResponse::export_all(&cfg)?;
    tools::resources::AgentListSectionsResponse::export_all(&cfg)?;
    tools::resources::AgentListModelsResponse::export_all(&cfg)?;
    tools::resources::AgentCreateSectionRequest::export_all(&cfg)?;
    tools::resources::AgentCreateSectionResponse::export_all(&cfg)?;
    tools::resources::AgentDeleteSectionResponse::export_all(&cfg)?;
    tools::session_types::DefaultAgentLogin::export_all(&cfg)?;
    tools::session_watches::AgentWatchSessionRequest::export_all(&cfg)?;
    tools::session_watches::AgentWatchSessionResponse::export_all(&cfg)?;
    tools::session_watches::SessionWatchNotice::export_all(&cfg)?;
    tools::sessions::AgentCreateSessionRequest::export_all(&cfg)?;
    tools::sessions::AgentSendMessageRequest::export_all(&cfg)?;
    tools::sessions::AgentSessionAccepted::export_all(&cfg)?;
    tools::sessions::AgentSessionWriteResponse::export_all(&cfg)?;
    tools::sessions::AgentCreateSessionResponse::export_all(&cfg)?;
    tools::sessions::AgentSendMessageResponse::export_all(&cfg)?;
    tools::session_actions::AgentSessionResponse::export_all(&cfg)?;
    tools::session_actions::AgentRenameSessionRequest::export_all(&cfg)?;
    tools::session_actions::AgentCloseSessionRequest::export_all(&cfg)?;
    tools::session_actions::AgentStopSessionResponse::export_all(&cfg)?;
    tools::session_actions::AgentGetMessageRequest::export_all(&cfg)?;
    tools::session_actions::AgentGetMessageResponse::export_all(&cfg)?;
    tools::session_reads::AgentListSessionsRequest::export_all(&cfg)?;
    tools::session_reads::AgentListSessionsResponse::export_all(&cfg)?;
    tools::session_reads::AgentReadSessionRequest::export_all(&cfg)?;
    tools::session_reads::AgentReadSessionResponse::export_all(&cfg)?;
    tools::session_reads::AgentTranscriptWindow::export_all(&cfg)?;
    tools::workspaces::AgentCreateWorkspaceRequest::export_all(&cfg)?;
    tools::github_merge::GitHubMergeRequest::export_all(&cfg)?;
    tools::github_merge::GitHubMergeStack::export_all(&cfg)?;
    tools::github_merge::RequestQueueStackMerge::export_all(&cfg)?;
    tools::merge_queue::MergeQueueBarState::export_all(&cfg)?;
    tools::merge_queue::MergeQueueLeaveNotice::export_all(&cfg)?;
    tools::merge_queue::RequestQueueMerge::export_all(&cfg)?;
    tools::merge_queue::ReorderMergeQueue::export_all(&cfg)?;
    tools::merge_queue::WorkspaceListRepository::export_all(&cfg)?;
    tools::workspaces::AgentCreateWorkspaceResponse::export_all(&cfg)?;
    tools::workspaces::AgentListWorkspacesRequest::export_all(&cfg)?;
    tools::workspaces::AgentListWorkspacesResponse::export_all(&cfg)?;
    tools::workspaces::AgentWorkspaceResponse::export_all(&cfg)?;
    tools::workspaces::AgentRenameWorkspaceRequest::export_all(&cfg)?;
    tools::workspaces::AgentMoveWorkspaceRequest::export_all(&cfg)?;
    let helper_output = root.join("runner/sdk-helper/src/generated");
    if helper_output.exists() {
        fs::remove_dir_all(&helper_output)?;
    }
    let helper_cfg = Config::new()
        .with_out_dir(helper_output)
        .with_large_int("number")
        .with_import_extension(Some("js"));
    sdk_helper::HelperRequest::export_all(&helper_cfg)?;
    sdk_helper::HelperOutput::export_all(&helper_cfg)?;
    sdk_helper_options::ProviderInput::export_all(&helper_cfg)?;
    provider_events::ProviderEvent::export_all(&helper_cfg)?;
    let status = Command::new("node")
        .arg(root.join("node_modules/prettier/bin/prettier.cjs"))
        .args([
            "--write",
            "src/shared/generated",
            "runner/sdk-helper/src/generated",
        ])
        .current_dir(root)
        .status()?;
    if !status.success() {
        return Err("Prettier failed".into());
    }
    Ok(())
}
