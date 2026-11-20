//! Checks of a repository move, and the folder of the next runner round.

use std::collections::BTreeSet;
use std::path::PathBuf;
use std::sync::Arc;

use cnd_runner_interface::runner_commands::{RunnerBranches, RunnerCommand, RunnerControlCommand};
use cnd_runner_interface::runner_handshake::RunnerToWorkspace;
use cnd_runner_interface::runner_repository::{
    RunnerRepositoryMove, RunnerRepositoryMoveRefusal, RunnerRepositoryMoveRefused,
};

use crate::config::Configuration;
use crate::link::ports::RunnerLink;
use crate::repository::io::{PathKind, RepositoryIo};

/// The folder and branches that the next runner round uses.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RepositoryTarget {
    /// Absolute repository folder.
    pub folder: PathBuf,
    /// Base branch of repository reports.
    pub default_branch: String,
    /// Branch of the workspace in that folder.
    pub workspace_branch: String,
}

impl RepositoryTarget {
    /// Point a configuration at this folder and its branches.
    pub fn apply(&self, configuration: &mut Configuration) {
        configuration.cwd = self.folder.clone();
        configuration.default_branch = self.default_branch.clone();
        configuration.workspace_branch = Some(self.workspace_branch.clone());
    }
}

/// The result of a move check.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MoveCheck {
    /// The runner already works in the folder. A repeated move changes nothing.
    Current,
    /// The runner keeps its folder.
    Refused(RunnerRepositoryMoveRefusal),
    /// The runner moves when no turn runs.
    Move(RepositoryTarget),
}

/// The folders that a move may name: the current folder and each folder variable.
pub struct RepositoryFolders {
    current: PathBuf,
    known: BTreeSet<PathBuf>,
    io: Arc<dyn RepositoryIo>,
}

impl RepositoryFolders {
    /// Read the folders of the configuration of this round.
    pub fn new(configuration: &Configuration, io: Arc<dyn RepositoryIo>) -> Self {
        Self {
            current: configuration.cwd.clone(),
            known: configuration
                .repository_directories
                .values()
                .cloned()
                .collect(),
            io,
        }
    }

    /// Accept only a known folder that holds a Git work tree.
    pub async fn check(&self, folder: &str, branches: &RunnerBranches) -> MoveCheck {
        let folder = PathBuf::from(folder);
        if folder == self.current {
            return MoveCheck::Current;
        }
        if !self.known.contains(&folder) {
            return MoveCheck::Refused(RunnerRepositoryMoveRefusal::UnknownFolder);
        }
        match self.io.kind(folder.join(".git")).await {
            Ok(PathKind::Directory | PathKind::File) => MoveCheck::Move(RepositoryTarget {
                folder,
                default_branch: branches.target_branch.clone(),
                workspace_branch: branches.workspace_branch.clone(),
            }),
            Ok(_) => MoveCheck::Refused(RunnerRepositoryMoveRefusal::NotRepository),
            Err(_) => {
                tracing::warn!("The repository folder of the move could not be read.");
                MoveCheck::Refused(RunnerRepositoryMoveRefusal::NotRepository)
            }
        }
    }
}

/// The move of a command, or none for every other command.
pub(crate) fn requested_move(command: &RunnerCommand) -> Option<&RunnerRepositoryMove> {
    match command {
        RunnerCommand::RunnerControlCommand(RunnerControlCommand::RunnerRepositoryMove(
            request,
        )) => Some(request),
        _ => None,
    }
}

/// Check one move. Reply to a refused move, and return the target of a good one.
pub(crate) async fn check_move(
    folders: Option<&RepositoryFolders>,
    link: &dyn RunnerLink,
    request: &RunnerRepositoryMove,
) -> Option<RepositoryTarget> {
    let RunnerRepositoryMove::RepositoryMove {
        command_id,
        folder,
        branches,
    } = request;
    let check = match folders {
        Some(folders) => folders.check(folder, branches).await,
        None => MoveCheck::Refused(RunnerRepositoryMoveRefusal::UnknownFolder),
    };
    match check {
        MoveCheck::Current => None,
        MoveCheck::Move(target) => Some(target),
        MoveCheck::Refused(reason) => {
            tracing::warn!(
                ?reason,
                "The runner refused a repository move and keeps its folder."
            );
            let refusal = RunnerRepositoryMoveRefused::RepositoryMoveRefused {
                command_id: command_id.clone(),
                reason,
            };
            if link
                .reply(RunnerToWorkspace::RunnerRepositoryMoveRefused(refusal))
                .await
                .is_err()
            {
                tracing::warn!("The refused repository move could not be answered.");
            }
            None
        }
    }
}

#[cfg(test)]
#[path = "_tests_/relocation_tests.rs"]
mod relocation_tests;
