//! Invalid domain input stops before any command or file effect.

use std::sync::Arc;

use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::{HostErrorCode, HostResult};
use unimock::Unimock;

use crate::dispatch::Dispatcher;
use crate::ports::Operations;

#[tokio::test]
async fn invalid_limits_paths_and_safe_integers_never_reach_native_effects()
-> crate::error::Result<()> {
    let operations: Arc<dyn Operations> = Arc::new(Dispatcher {
        commands: Arc::new(Unimock::new(())),
        files: Arc::new(Unimock::new(())),
    });
    for operation in [
        HostOperation::CommandRun {
            command: "test".into(),
            timeout_seconds: 0,
        },
        HostOperation::CommandRun {
            command: "test".into(),
            timeout_seconds: 601,
        },
        HostOperation::CommandStart {
            command: "bad\0command".into(),
        },
        HostOperation::CommandStatus {
            process_id: 0,
            stdout_offset: 0,
            stderr_offset: 0,
        },
        HostOperation::CommandStatus {
            process_id: 9_007_199_254_740_992,
            stdout_offset: 0,
            stderr_offset: 0,
        },
        HostOperation::CommandStatus {
            process_id: 1,
            stdout_offset: 9_007_199_254_740_992,
            stderr_offset: 0,
        },
        HostOperation::FileInfo {
            path: "relative".into(),
        },
        HostOperation::FileRead {
            path: "/nul\0file".into(),
            max_bytes: 1,
        },
        HostOperation::FileRead {
            path: "/file".into(),
            max_bytes: 5_242_881,
        },
    ] {
        assert_eq!(
            operations.execute(operation).await?,
            HostResult::Error {
                code: HostErrorCode::InvalidRequest
            }
        );
    }
    Ok(())
}
