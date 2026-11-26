//! Runner wire contracts.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::chat_events::AgentChatEvent;
use crate::file_tree::RunnerFileEvent;
use crate::ports::RunnerPortsUpdated;
use crate::runner_tool_detail::RunnerToolDetailPart;
use crate::skills::RunnerSkillsUpdated;
use crate::workspaces::WorkspaceStart;

/// RunnerReady.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerReady {
    /// runner.ready.
    #[serde(rename = "runner.ready")]
    RunnerReady {},
}

/// RunnerStartUpdated.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerStartUpdated {
    /// start.updated.
    #[serde(rename = "start.updated")]
    StartUpdated {
        /// start.
        start: WorkspaceStart,
    },
}

/// RunnerWorkspaceTitle.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerWorkspaceTitle {
    /// workspace.title.
    #[serde(rename = "workspace.title")]
    WorkspaceTitle {
        /// name.
        name: String,
    },
}

/// Workspace refusal markers never enter this union or the runner outbox.
/// A failed tree scan sends files.unavailable before runner.ready.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged)]
pub enum RunnerEvent {
    /// Private complete tool source. Never published as a chat event.
    RunnerToolDetailPart(RunnerToolDetailPart),
    /// AgentChatEvent.
    AgentChatEvent(AgentChatEvent),
    /// RunnerFileEvent.
    RunnerFileEvent(RunnerFileEvent),
    /// RunnerPortsUpdated.
    RunnerPortsUpdated(RunnerPortsUpdated),
    /// Complete skill metadata for both agents.
    RunnerSkillsUpdated(RunnerSkillsUpdated),
    /// RunnerReady.
    RunnerReady(RunnerReady),
    /// RunnerStartUpdated.
    RunnerStartUpdated(RunnerStartUpdated),
    /// RunnerWorkspaceTitle.
    RunnerWorkspaceTitle(RunnerWorkspaceTitle),
}
