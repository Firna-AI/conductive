//! Configuration sent privately to one SDK helper process.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::agents::AgentChoice;
use crate::commit_author::CommitAuthor;
use crate::runner_commands::{RunnerBranches, RunnerMessageDuringTurn, RunnerNotice, RunnerTurn};
use crate::runner_credentials::{RunnerLogin, RunnerTurnCredential};
use crate::wire::ReadonlyVec;

/// Agent credentials used only by the SDK helper and agent process.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum HelperCredential {
    /// Temporary model gateway credential.
    Gateway {
        /// The gateway credential fields.
        #[serde(flatten)]
        credential: RunnerTurnCredential,
    },
    /// Developer measurement credential.
    Native {
        /// The developer-supplied login.
        login: RunnerLogin,
    },
}

/// Workspace tool context inherited by an agent's MCP child.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceToolContext {
    /// Machine endpoint origin.
    pub machine_origin: String,
    /// Private workspace token.
    pub workspace_token: String,
    /// Original active turn identity.
    pub turn_id: String,
}

/// Input accepted by an agent adapter.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged)]
pub enum ProviderInput {
    /// First input of a turn.
    Turn(RunnerTurn),
    /// Later input of the same turn.
    Message(RunnerMessageDuringTurn),
    /// App notes with no member message or sender.
    Notice(RunnerNotice),
}

/// Configured org source and trust policy, independent of copy availability.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct OrgSkills {
    /// Valid public GitHub source identity as owner/name.
    pub repository: String,
    /// Trusted repository identity, absent when no matching grant exists.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional = nullable)]
    pub trusted_repository: Option<String>,
    /// Immutable available copy, absent before a successful copy or restore.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional = nullable)]
    pub directory: Option<String>,
}

/// Serializable agent start configuration. It is never persisted by the helper.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct HelperOptions {
    /// Repository folder.
    pub cwd: String,
    /// Private agent home.
    pub home: String,
    /// Org source and trust policy, absent when no valid source is configured.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional = nullable)]
    pub org_skills: Option<OrgSkills>,
    /// Conductive session identity.
    pub session_id: String,
    /// Model gateway or native measurement endpoint.
    pub endpoint: String,
    /// Private credential.
    pub credential: HelperCredential,
    /// Turn commit author, or the workspace default.
    pub commit_author: Option<CommitAuthor>,
    /// Selected model and effort.
    pub choice: AgentChoice,
    /// Saved provider conversation.
    pub conversation_id: Option<String>,
    /// Saved agent instructions.
    pub instructions: String,
    /// Branches named by the saved instructions.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional = nullable)]
    pub instruction_branches: Option<RunnerBranches>,
    /// Repository folder named by the saved instructions, when known.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional = nullable)]
    pub instruction_folder: Option<String>,
    /// Workspace MCP context.
    pub tools: WorkspaceToolContext,
    /// Work named by earlier processes of this turn.
    #[ts(as = "ReadonlyVec<String>")]
    pub background_note_ids: Vec<String>,
}
