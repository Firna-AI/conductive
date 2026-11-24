//! Request capacity, duplicate IDs, and cancellation at the local deadline.

#![expect(clippy::unwrap_used, reason = "Fixture failures must stop the test.")]

use std::future;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use cnd_runner_interface::computer::limits::COMPUTER_MAX_PENDING_REQUESTS;
use cnd_runner_interface::computer::messages::{ComputerToWorker, WorkerToComputer};
use cnd_runner_interface::computer::operations::{ComputerOperation, ComputerRelease};
use cnd_runner_interface::computer::results::{ComputerErrorCode, ComputerResult};
use tokio::sync::Notify;
use unimock::{MockFn, Unimock, matching};

use crate::activity::Activity;
use crate::connection_support::{Peer, Sent, context, virtual_timer};
use crate::diagnostics::DiagnosticsMock;
use crate::error::Error;
use crate::operations::OperationsMock;
use crate::socket::Incoming;

use super::{State, deadline};

fn get(id: u32) -> Incoming {
    Incoming::Message(WorkerToComputer::Request {
        request_id: id,
        operation: ComputerOperation::ContainerGet {
            container: "one".into(),
        },
    })
}

#[tokio::test(start_paused = true)]
async fn an_extra_request_gets_busy_while_every_slot_is_pending() {
    let mut peer = Peer::new();
    let operations = Arc::new(Unimock::new(
        OperationsMock::execute
            .some_call(matching!(_, _))
            .answers(&|_, _, _| Box::pin(future::pending()))
            .at_least_times(0),
    ));
    let mut state = State::new(
        peer.socket.clone(),
        context(),
        operations,
        virtual_timer(),
        Arc::new(Unimock::new(())),
        Arc::new(Activity::default()),
    );
    let last = u32::try_from(COMPUTER_MAX_PENDING_REQUESTS).unwrap();
    for id in 1..=last + 1 {
        state.incoming(get(id)).await.unwrap();
    }
    assert_eq!(state.tasks.len(), COMPUTER_MAX_PENDING_REQUESTS);
    assert_eq!(
        peer.rx.recv().await,
        Some(Sent::Message(ComputerToWorker::Reply {
            request_id: last + 1,
            result: ComputerResult::Error {
                code: ComputerErrorCode::Busy
            }
        }))
    );
    state.tasks.shutdown().await;
}

#[tokio::test(start_paused = true)]
async fn a_second_message_with_a_running_id_is_a_protocol_error() {
    let peer = Peer::new();
    let entered = Arc::new(Notify::new());
    let notify = entered.clone();
    let operations = Arc::new(Unimock::new(
        OperationsMock::execute
            .some_call(matching!(_, _))
            .answers_arc(Arc::new(move |_, _, _| {
                notify.notify_one();
                Box::pin(future::pending())
            })),
    ));
    let mut state = State::new(
        peer.socket.clone(),
        context(),
        operations,
        virtual_timer(),
        Arc::new(Unimock::new(())),
        Arc::new(Activity::default()),
    );
    state.incoming(get(11)).await.unwrap();
    entered.notified().await;
    assert!(matches!(
        state.incoming(get(11)).await,
        Err(Error::Protocol)
    ));
    assert!(matches!(
        state.incoming(Incoming::Part(11)).await,
        Err(Error::Protocol)
    ));
    state.tasks.shutdown().await;
}

struct OnDrop(Arc<AtomicBool>);

impl Drop for OnDrop {
    fn drop(&mut self) {
        self.0.store(true, Ordering::SeqCst);
    }
}

#[tokio::test(start_paused = true)]
async fn deadline_cancels_an_operation_and_replies_internal() {
    let mut peer = Peer::new();
    let entered = Arc::new(Notify::new());
    let cancelled = Arc::new(AtomicBool::new(false));
    let observed = cancelled.clone();
    let started = entered.clone();
    let operations = Arc::new(Unimock::new(
        OperationsMock::execute
            .some_call(matching!(_, _))
            .answers_arc(Arc::new(move |_, _, _| {
                let guard = OnDrop(cancelled.clone());
                started.notify_one();
                Box::pin(async move {
                    let _guard = guard;
                    future::pending().await
                })
            })),
    ));
    let diagnostics = Arc::new(Unimock::new((
        DiagnosticsMock::request_timed_out
            .some_call(matching!())
            .returns(()),
        DiagnosticsMock::operation_failed
            .some_call(matching!(_))
            .returns(()),
    )));
    let mut state = State::new(
        peer.socket.clone(),
        context(),
        operations,
        virtual_timer(),
        diagnostics,
        Arc::new(Activity::default()),
    );
    state.incoming(get(10)).await.unwrap();
    entered.notified().await;
    tokio::time::advance(Duration::from_secs(49)).await;
    assert!(!observed.load(Ordering::SeqCst));
    tokio::time::advance(Duration::from_secs(1)).await;
    let (id, result) = state.tasks.join_next().await.unwrap().unwrap();
    assert!(observed.load(Ordering::SeqCst));
    state.completed(id, result).unwrap();
    assert_eq!(
        peer.rx.recv().await,
        Some(Sent::Message(ComputerToWorker::Reply {
            request_id: 10,
            result: ComputerResult::Error {
                code: ComputerErrorCode::Internal
            }
        }))
    );
}

#[test]
fn create_save_and_bootstrap_have_the_long_deadline() {
    let container = "box".to_owned();
    let release = ComputerRelease {
        version: "0.0.4".into(),
        digest: "b".repeat(64),
    };
    for operation in [
        ComputerOperation::ContainerCreate {
            container: container.clone(),
            image: cnd_runner_interface::computer::operations::ContainerImage::Base {
                release: release.clone(),
            },
            env: Vec::new(),
            cpus: 2,
            memory_bytes: 10,
        },
        ComputerOperation::ImageSave {
            container: container.clone(),
            image: "org".into(),
        },
        ComputerOperation::ContainerBootstrap { container, release },
    ] {
        assert_eq!(deadline(&operation), Duration::from_secs(14 * 60));
    }
}
