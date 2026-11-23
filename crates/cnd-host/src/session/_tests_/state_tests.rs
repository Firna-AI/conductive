//! Request admission and stream activation through the actual session state.

#![expect(
    clippy::unwrap_used,
    reason = "In-memory fixture failures must stop the test."
)]

use std::collections::BTreeSet;
use std::sync::{Arc, Mutex};

use cnd_runner_interface::host::literals::{HostProtocolVersion, HostStreamPort};
use cnd_runner_interface::host::messages::{HostToWorker, WorkerToHost};
use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::{HostErrorCode, HostResult};
use tokio::task::JoinSet;
use unimock::{MockFn, Unimock, matching};

use crate::diagnostics::DiagnosticsMock;
use crate::error::Error;
use crate::ports::{Incoming, OperationsMock, SocketMock};
use crate::streams::ports::StreamsMock;
use crate::test_support::Time;

use super::State;

#[tokio::test]
async fn requests_need_welcome_and_only_sixty_four_can_await_replies() {
    let messages = Arc::new(Mutex::new(Vec::new()));
    let captured = messages.clone();
    let socket = Arc::new(Unimock::new(
        SocketMock::send
            .some_call(matching!(_))
            .answers_arc(Arc::new(move |_, message| {
                captured.lock().unwrap().push(message.clone());
                Ok(())
            })),
    ));
    let operations = Arc::new(Unimock::new(
        OperationsMock::execute
            .each_call(matching!(_))
            .answers(&|_, _| {
                Box::pin(async {
                    Ok(HostResult::Error {
                        code: HostErrorCode::Internal,
                    })
                })
            }),
    ));
    let mut state = State {
        socket,
        operations,
        streams: Arc::new(Unimock::new(())),
        tasks: JoinSet::new(),
        writes: JoinSet::new(),
        pending: BTreeSet::new(),
        welcomed: false,
        clock: Time::new().clock,
        diagnostics: Arc::new(Unimock::new(
            DiagnosticsMock::welcomed
                .some_call(matching!())
                .returns(())
                .once(),
        )),
    };
    let request = |request_id| {
        Incoming::Message(WorkerToHost::Request {
            request_id,
            operation: HostOperation::FileInfo {
                path: "/file".into(),
            },
        })
    };
    assert!(matches!(
        state.incoming(request(0)).await,
        Err(Error::Protocol)
    ));
    state
        .incoming(Incoming::Message(WorkerToHost::Welcome {
            host_protocol_version: HostProtocolVersion,
        }))
        .await
        .unwrap();
    for id in 0..65 {
        state.incoming(request(id)).await.unwrap();
    }
    let _ = state.tasks.join_next().await;
    let written = state.writes.join_next().await.unwrap();
    state.written(written).unwrap();
    assert_eq!(state.pending.len(), 64);
    assert_eq!(
        *messages.lock().unwrap(),
        [HostToWorker::Reply {
            request_id: 64,
            result: HostResult::Error {
                code: HostErrorCode::Busy
            }
        }]
    );
    state.tasks.shutdown().await;
}

#[tokio::test]
async fn stream_opened_is_written_before_local_reads_are_activated() {
    let effects = Arc::new(Unimock::new((
        StreamsMock::open.next_call(matching!(9, HostStreamPort::PreviewRelay)).returns(Ok(HostResult::StreamOpened { stream_id: 9 })),
        SocketMock::send.next_call(matching!((message) if **message == HostToWorker::Reply { request_id: 7, result: HostResult::StreamOpened { stream_id: 9 } })).returns(Ok(())),
        StreamsMock::activate.next_call(matching!(9)).returns(()),
    )));
    let mut state = State {
        socket: effects.clone(),
        operations: Arc::new(Unimock::new(())),
        streams: effects,
        tasks: JoinSet::new(),
        writes: JoinSet::new(),
        pending: BTreeSet::new(),
        welcomed: true,
        clock: Arc::new(Unimock::new(())),
        diagnostics: Arc::new(Unimock::new(())),
    };
    state
        .incoming(Incoming::Message(WorkerToHost::Request {
            request_id: 7,
            operation: HostOperation::StreamOpen {
                stream_id: 9,
                port: HostStreamPort::PreviewRelay,
            },
        }))
        .await
        .unwrap();
    let executed = state.tasks.join_next().await.unwrap();
    state.completed(executed).await.unwrap();
    let written = state.writes.join_next().await.unwrap();
    state.written(written).unwrap();
    assert_eq!(state.pending.len(), 0);
}
