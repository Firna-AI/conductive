//! Real requests use shared command records across socket drops and reconnects.

use std::sync::Arc;
use std::time::Duration;

use cnd_host::commands::native::NativeCommands;
use cnd_host::dispatch::Dispatcher;
use cnd_host::files::NativeFiles;
use cnd_host::ports::{Commands, Operations};
use cnd_host::streams::local::LoopbackNetwork;
use cnd_runner_interface::host::messages::HostToWorker;
use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::{HostCommandState, HostFileEncoding, HostResult};
use tokio::sync::watch;

use super::support::{self, TestResult};

#[tokio::test]
async fn real_host_operations_and_detached_commands_survive_a_socket_drop() -> TestResult {
    let folder = tempfile::tempdir()?;
    let file = folder.path().join("file");
    let gate = folder.path().join("continue");
    tokio::fs::write(&file, "abc").await?;
    let commands: Arc<dyn Commands> = Arc::new(NativeCommands::new(
        folder.path().join("commands"),
        folder.path().into(),
    ));
    let operations: Arc<dyn Operations> = Arc::new(Dispatcher {
        commands,
        files: Arc::new(NativeFiles),
    });
    let session = support::session(operations, Arc::new(LoopbackNetwork));
    let (socket, mut peer) = support::sockets().await?;
    let (_stop, shutdown) = watch::channel(false);
    let serving = session.clone();
    let run = tokio::spawn(async move { serving.serve(socket, "test", shutdown).await });
    assert_eq!(
        support::message(&mut peer).await?,
        HostToWorker::Hello {
            host_protocol_version: 1,
            program_version: "test".into()
        }
    );
    support::welcome(&mut peer).await?;
    assert_eq!(
        support::request(
            &mut peer,
            1,
            HostOperation::CommandRun {
                command: "printf first".into(),
                timeout_seconds: 10
            }
        )
        .await?,
        HostResult::CommandResult {
            exit_code: Some(0),
            stdout: "first".into(),
            stderr: String::new(),
            timed_out: false
        }
    );
    let started = support::request(
        &mut peer,
        2,
        HostOperation::CommandStart {
            command: format!(
                "printf start; while [ ! -e '{}' ]; do :; done; printf done",
                gate.display()
            ),
        },
    )
    .await?;
    assert!(matches!(started, HostResult::CommandStarted { .. }));
    let HostResult::CommandStarted { process_id } = started else {
        return Err("wrong start reply".into());
    };
    peer.close(None).await?;
    assert!(run.await?.welcomed);
    let (socket, mut peer) = support::sockets().await?;
    let (_stop, shutdown) = watch::channel(false);
    let run = tokio::spawn(async move { session.serve(socket, "test", shutdown).await });
    assert_eq!(
        support::message(&mut peer).await?,
        HostToWorker::Hello {
            host_protocol_version: 1,
            program_version: "test".into()
        }
    );
    support::welcome(&mut peer).await?;
    let status = support::request(
        &mut peer,
        3,
        HostOperation::CommandStatus {
            process_id,
            stdout_offset: 0,
            stderr_offset: 0,
        },
    )
    .await?;
    assert!(matches!(
        status,
        HostResult::CommandStatus {
            state: HostCommandState::Running,
            running: true,
            ..
        }
    ));
    let path = file.to_string_lossy().into_owned();
    assert_eq!(
        support::request(&mut peer, 4, HostOperation::FileInfo { path: path.clone() }).await?,
        HostResult::FileInfo {
            path: path.clone(),
            size_bytes: 3,
            is_directory: false
        }
    );
    assert_eq!(
        support::request(
            &mut peer,
            5,
            HostOperation::FileRead {
                path: path.clone(),
                max_bytes: 3
            }
        )
        .await?,
        HostResult::FileContent {
            path,
            size_bytes: 3,
            encoding: HostFileEncoding::Base64,
            content: "YWJj".into()
        }
    );
    tokio::fs::write(gate, "continue").await?;
    let result = tokio::time::timeout(Duration::from_secs(10), async {
        loop {
            let result = support::request(
                &mut peer,
                6,
                HostOperation::CommandStatus {
                    process_id,
                    stdout_offset: 0,
                    stderr_offset: 0,
                },
            )
            .await?;
            if matches!(
                result,
                HostResult::CommandStatus {
                    state: HostCommandState::Exited,
                    ..
                }
            ) {
                return Ok::<_, Box<dyn std::error::Error + Send + Sync>>(result);
            }
        }
    })
    .await??;
    assert_eq!(
        result,
        HostResult::CommandStatus {
            process_id,
            state: HostCommandState::Exited,
            running: false,
            exit_code: Some(0),
            timed_out: None,
            stdout: "startdone".into(),
            stderr: String::new(),
            stdout_next_offset: 9,
            stderr_next_offset: 0,
            more: false
        }
    );
    let large = support::request(
        &mut peer,
        7,
        HostOperation::CommandRun {
            command: "head -c 300000 /dev/zero | tr '\\0' x".into(),
            timeout_seconds: 10,
        },
    )
    .await?;
    assert_eq!(
        large,
        HostResult::CommandResult {
            exit_code: Some(0),
            stdout: "x".repeat(300_000),
            stderr: String::new(),
            timed_out: false
        }
    );
    peer.close(None).await?;
    assert!(run.await?.welcomed);
    Ok(())
}
