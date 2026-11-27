//! Checks of a repository move, and the folder of the next runner round.

use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use cnd_runner_interface::runner_commands::{RunnerBranches, RunnerCommand, RunnerControlCommand};
use cnd_runner_interface::runner_handshake::RunnerToWorkspace;
use cnd_runner_interface::runner_repository::{
    RunnerRepositoryMove, RunnerRepositoryMoveRefusal, RunnerRepositoryMoveRefused,
};

use crate::config::{Configuration, repository_variable};
use crate::link::ports::RunnerLink;
use crate::repository::io::{PathKind, RepositoryIo};

const CODE_DIRECTORY: &str = "/home/user/code";

/// The folder and branches that the next runner round uses.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RepositoryTarget {
    /// Absolute repository folder.
    pub folder: PathBuf,
    /// Base branch of repository reports.
    pub default_branch: String,
    /// Branch of the workspace in that folder.
    pub workspace_branch: String,
    /// Variable to register in the next round.
    pub variable: Option<String>,
}

impl RepositoryTarget {
    /// Point a configuration at this folder and its branches.
    pub fn apply(&self, configuration: &mut Configuration) {
        configuration.cwd = self.folder.clone();
        configuration.default_branch = self.default_branch.clone();
        configuration.workspace_branch = Some(self.workspace_branch.clone());
        if let Some(variable) = &self.variable {
            configuration
                .repository_directories
                .insert(variable.clone(), self.folder.clone());
        }
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

/// Configuration and disk checks for the folders a move may name.
pub struct RepositoryFolders {
    current: PathBuf,
    known: BTreeMap<String, PathBuf>,
    io: Arc<dyn RepositoryIo>,
}

impl RepositoryFolders {
    /// Read the folders of the configuration of this round.
    pub fn new(configuration: &Configuration, io: Arc<dyn RepositoryIo>) -> Self {
        Self {
            current: configuration.cwd.clone(),
            known: configuration.repository_directories.clone(),
            io,
        }
    }

    /// Accept a known folder or register a new work tree under the code folder.
    pub async fn check(
        &self,
        folder: &str,
        branches: &RunnerBranches,
        variable: Option<&str>,
    ) -> MoveCheck {
        let folder = PathBuf::from(folder);
        let registered = folder == self.current || self.known.values().any(|path| path == &folder);
        let addition = match variable {
            None if registered => None,
            Some(name) if self.known.get(name) == Some(&folder) => None,
            Some(name)
                if repository_variable(name)
                    && !self.known.contains_key(name)
                    && code_child(&folder) =>
            {
                Some(name)
            }
            _ => return MoveCheck::Refused(RunnerRepositoryMoveRefusal::UnknownFolder),
        };
        if folder == self.current && addition.is_none() {
            return MoveCheck::Current;
        }
        if addition.is_some()
            && !matches!(self.io.kind(folder.clone()).await, Ok(PathKind::Directory))
        {
            return MoveCheck::Refused(RunnerRepositoryMoveRefusal::NotRepository);
        }
        match self.io.kind(folder.join(".git")).await {
            Ok(PathKind::Directory | PathKind::File) => {}
            Ok(_) => return MoveCheck::Refused(RunnerRepositoryMoveRefusal::NotRepository),
            Err(_) => {
                tracing::warn!("The repository folder of the move could not be read.");
                return MoveCheck::Refused(RunnerRepositoryMoveRefusal::NotRepository);
            }
        }
        if addition.is_some() && !self.io.is_work_tree(folder.clone()).await {
            return MoveCheck::Refused(RunnerRepositoryMoveRefusal::NotRepository);
        }
        MoveCheck::Move(RepositoryTarget {
            folder,
            default_branch: branches.target_branch.clone(),
            workspace_branch: branches.workspace_branch.clone(),
            variable: addition.map(str::to_owned),
        })
    }
}

fn code_child(folder: &Path) -> bool {
    folder
        .file_name()
        .is_some_and(|name| Path::new(CODE_DIRECTORY).join(name).as_os_str() == folder.as_os_str())
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
        variable,
    } = request;
    let check = match folders {
        Some(folders) => folders.check(folder, branches, variable.as_deref()).await,
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
