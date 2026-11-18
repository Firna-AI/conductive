//! Repository folder wire contracts: the current repository and the folder move.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::runner_commands::RunnerBranches;

/// The repository of the workspace and its folder in the sandbox.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct RunnerRepository {
    /// GitHub owner and name, such as acme/storefront.
    pub full_name: String,
    /// Absolute folder of the repository in the sandbox.
    pub folder: String,
}

/// Send only to a runner whose hello has repositoryFolder. An older runner
/// closes its socket on this command. A good move ends with a new hello that
/// names the folder. A refused move gets a repository.move.refused reply.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerRepositoryMove {
    /// repository.move.
    #[serde(rename = "repository.move")]
    RepositoryMove {
        /// commandId.
        command_id: String,
        /// Absolute folder of the workspace's repository in the sandbox.
        folder: String,
        /// The branches of the workspace in that folder.
        branches: RunnerBranches,
    },
}

/// Unnumbered reply to a refused move. The runner keeps its folder.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerRepositoryMoveRefused {
    /// repository.move.refused.
    #[serde(rename = "repository.move.refused")]
    RepositoryMoveRefused {
        /// commandId of the refused move.
        command_id: String,
        /// reason.
        reason: RunnerRepositoryMoveRefusal,
    },
}

/// Why the runner refused a move.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, TS)]
pub enum RunnerRepositoryMoveRefusal {
    /// The folder is not a repository folder of the sandbox variables.
    #[serde(rename = "unknown_folder")]
    UnknownFolder,
    /// The folder holds no Git work tree.
    #[serde(rename = "not_repository")]
    NotRepository,
}
