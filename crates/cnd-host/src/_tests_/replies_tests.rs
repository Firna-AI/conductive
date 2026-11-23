//! Whole-JSON budgets include envelopes and escaped text.

use cnd_runner_interface::host::messages::HostToWorker;
use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::{HostCommandState, HostErrorCode, HostResult};

use crate::replies::{bounded, budget};

#[test]
fn command_overflow_counts_json_escaping_and_the_complete_reply_envelope()
-> crate::error::Result<()> {
    let operation = HostOperation::CommandRun {
        command: "test".into(),
        timeout_seconds: 1,
    };
    let result = HostResult::CommandResult {
        exit_code: Some(0),
        stdout: "\0".repeat(3_145_728),
        stderr: String::new(),
        timed_out: false,
    };
    assert_eq!(
        bounded(42, result, budget(&operation))?,
        HostToWorker::Reply {
            request_id: 42,
            result: HostResult::Error {
                code: HostErrorCode::OutputTooLarge
            }
        }
    );
    assert_eq!(
        budget(&HostOperation::FileRead {
            path: "/file".into(),
            max_bytes: 5_242_880
        }),
        8_039_084
    );
    assert_eq!(
        budget(&HostOperation::FileInfo {
            path: "/file".into()
        }),
        1_048_576
    );
    Ok(())
}

#[test]
fn status_cuts_at_utf8_boundaries_and_preserves_raw_next_offsets() -> crate::error::Result<()> {
    let result = HostResult::CommandStatus {
        process_id: 3,
        state: HostCommandState::Exited,
        running: false,
        exit_code: Some(0),
        timed_out: None,
        stdout: "€".repeat(400),
        stderr: String::new(),
        stdout_next_offset: 1200,
        stderr_next_offset: 0,
        more: false,
    };
    let bounded = bounded(7, result, 512)?;
    assert_eq!(
        bounded,
        HostToWorker::Reply {
            request_id: 7,
            result: HostResult::CommandStatus {
                process_id: 3,
                state: HostCommandState::Exited,
                running: false,
                exit_code: Some(0),
                timed_out: None,
                stdout: "€".repeat(50),
                stderr: String::new(),
                stdout_next_offset: 150,
                stderr_next_offset: 0,
                more: true
            }
        }
    );
    Ok(())
}
