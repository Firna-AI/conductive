//! A stalled ordinary operation replies internal and releases its request slot.

#![expect(clippy::unwrap_used, reason = "Fixture failures must stop the test.")]

use std::collections::BTreeSet;
use std::sync::{Arc, Mutex};
use std::task::Poll;
use std::time::Duration;

use cnd_runner_interface::host::messages::{HostToWorker, WorkerToHost};
use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::{HostErrorCode, HostResult};
use tokio::sync::Notify;
use tokio::task::JoinSet;
use unimock::{MockFn, Unimock, matching};

use crate::ports::{ClockMock, Incoming, OperationsMock, SocketMock};

use super::super::state::State;

#[tokio::test]
async fn a_stalled_operation_replies_internal_at_thirty_seconds_and_releases_its_slot() {
    let entered = Arc::new(Notify::new());
    let notify = entered.clone();
    let messages = Arc::new(Mutex::new(Vec::new()));
    let captured = messages.clone();
    let mut state = State {
        socket: Arc::new(Unimock::new(
            SocketMock::send
                .some_call(matching!(_))
                .answers_arc(Arc::new(move |_, message| {
                    captured.lock().unwrap().push(message.clone());
                    Ok(())
                })),
        )),
        operations: Arc::new(Unimock::new(
            OperationsMock::execute
                .some_call(matching!(_))
                .answers_arc(Arc::new(move |_, _| {
                    let notify = notify.clone();
                    Box::pin(async move {
                        notify.notify_one();
                        std::future::pending().await
                    })
                })),
        )),
        streams: Arc::new(Unimock::new(())),
        tasks: JoinSet::new(),
        writes: JoinSet::new(),
        pending: BTreeSet::new(),
        welcomed: true,
        diagnostics: Arc::new(Unimock::new(())),
        clock: Arc::new(Unimock::new(
            ClockMock::wait
                .some_call(matching!((duration) if *duration == Duration::from_secs(30)))
                .answers(&|_, _| Box::pin(async {}))
                .at_least_times(0),
        )),
    };
    let request = || {
        Incoming::Message(WorkerToHost::Request {
            request_id: 7,
            operation: HostOperation::FileInfo {
                path: "/stuck".into(),
            },
        })
    };
    state.incoming(request()).await.unwrap();
    entered.notified().await;
    let observed = {
        let next = state.tasks.join_next();
        tokio::pin!(next);
        futures_util::poll!(&mut next)
    };
    state.tasks.shutdown().await;
    assert!(
        observed.is_ready(),
        "the 30-second operation deadline did not complete the task"
    );
    let result = match observed {
        Poll::Ready(result) => result,
        Poll::Pending => None,
    }
    .unwrap();
    state.completed(result).await.unwrap();
    let written = state.writes.join_next().await.unwrap();
    state.written(written).unwrap();
    assert_eq!(
        *messages.lock().unwrap(),
        [HostToWorker::Reply {
            request_id: 7,
            result: HostResult::Error {
                code: HostErrorCode::Internal
            }
        }]
    );
    assert_eq!(state.pending.len(), 0);
    state.incoming(request()).await.unwrap();
    assert_eq!(state.pending.len(), 1);
    state.tasks.shutdown().await;
}
