//! File and diff responses that bypass the scan queue.

use cnd_runner_interface::runner_files::{
    DiffReadOutcome, FileReadOutcome, RunnerDiffResult, RunnerFileCommand, RunnerFileResponse,
    RunnerFileResult, RunnerReadDiff, RunnerReadFile,
};
use cnd_runner_interface::wire::{WireFalse, WireTrue};

use crate::repository::service::Repository;

/// Answer a read or diff without reserving a file scan.
pub(super) async fn respond(
    repository: &dyn Repository,
    command: RunnerFileCommand,
) -> RunnerFileResponse {
    match command {
        RunnerFileCommand::Read(RunnerReadFile::Read {
            request_id,
            path,
            max_bytes,
        }) => {
            let result = match repository.read(path, max_bytes).await {
                Ok(file) => FileReadOutcome::Success { ok: WireTrue, file },
                Err(error) => FileReadOutcome::Failure {
                    ok: WireFalse,
                    error: error.file_error(),
                },
            };
            RunnerFileResponse::File(RunnerFileResult::Read { request_id, result })
        }
        RunnerFileCommand::Diff(RunnerReadDiff::Diff {
            request_id,
            path,
            default_branch,
        }) => {
            let result = match repository.diff(path, default_branch).await {
                Ok(diff) => DiffReadOutcome::Success { ok: WireTrue, diff },
                Err(error) => DiffReadOutcome::Failure {
                    ok: WireFalse,
                    error: error.file_error(),
                },
            };
            RunnerFileResponse::Diff(RunnerDiffResult::Diff { request_id, result })
        }
    }
}
