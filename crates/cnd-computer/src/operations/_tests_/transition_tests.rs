//! Starting and inspecting containers with active or interrupted transitions.

#![expect(
    clippy::unwrap_used,
    reason = "The start fixture must report its cancellation."
)]

use std::future;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use cnd_runner_interface::computer::operations::ComputerOperation;
use cnd_runner_interface::computer::results::{ComputerErrorCode, ComputerResult, ContainerState};
use tokio::sync::Notify;
use unimock::{MockFn, Unimock, matching};

use crate::connection_support::context;
use crate::engine::error::EngineError;
use crate::engine::ports::{Engine, EngineMock};
use crate::engine::states::ContainerStatus;

use super::{Dispatcher, Operations};

fn dispatcher(engine: Arc<dyn Engine>) -> Dispatcher {
    let unused = Arc::new(Unimock::new(()));
    Dispatcher::new(engine, unused.clone(), unused.clone(), unused)
}

fn start() -> ComputerOperation {
    ComputerOperation::ContainerStart {
        container: "box".into(),
        env: Vec::new(),
    }
}

fn running() -> ComputerResult {
    ComputerResult::Container {
        container: "box".into(),
        state: ContainerState::Running,
    }
}

async fn fail_env(started_running: bool) -> bool {
    let running = Arc::new(AtomicBool::new(started_running));
    let started = running.clone();
    let stopped = running.clone();
    let engine = Arc::new(
        Unimock::new((
            EngineMock::inspect
                .some_call(matching!("box"))
                .answers_arc(Arc::new(move |_, _| {
                    Ok(if started_running {
                        ContainerStatus::Running
                    } else {
                        ContainerStatus::Stopped
                    })
                })),
            EngineMock::start
                .some_call(matching!("box"))
                .answers_arc(Arc::new(move |_, _| {
                    started.store(true, Ordering::SeqCst);
                    Ok(())
                })),
            EngineMock::write_environment
                .some_call(matching!("box", _))
                .answers(&|_, _, _| Box::pin(async { Err(EngineError::Failed) })),
            EngineMock::stop
                .some_call(matching!("box"))
                .answers_arc(Arc::new(move |_, _| {
                    stopped.store(false, Ordering::SeqCst);
                    Ok(())
                })),
        ))
        .no_verify_in_drop(),
    );
    let result = dispatcher(engine)
        .execute(start(), Arc::new(context()))
        .await;
    assert_eq!(
        result,
        ComputerResult::Error {
            code: ComputerErrorCode::Internal
        }
    );
    running.load(Ordering::SeqCst)
}

#[tokio::test]
async fn failed_env_write_stops_the_container_started_by_the_request() {
    assert!(
        !fail_env(false).await,
        "The failed start left the container running"
    );
}

#[tokio::test]
async fn failed_env_write_preserves_a_container_that_was_running() {
    assert!(
        fail_env(true).await,
        "The env write stopped an already running container"
    );
}

#[tokio::test]
async fn cancelling_an_env_write_stops_the_container_started_by_the_request() {
    let entered = Arc::new(Notify::new());
    let signal = entered.clone();
    let stopped = Arc::new(AtomicBool::new(false));
    let restored = stopped.clone();
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .some_call(matching!("box"))
            .returns(Ok(ContainerStatus::Stopped)),
        EngineMock::start
            .next_call(matching!("box"))
            .returns(Ok(())),
        EngineMock::write_environment
            .next_call(matching!("box", _))
            .answers_arc(Arc::new(move |_, _, _| {
                signal.notify_one();
                Box::pin(future::pending())
            })),
        EngineMock::stop
            .some_call(matching!("box"))
            .answers_arc(Arc::new(move |_, _| {
                restored.store(true, Ordering::SeqCst);
                Ok(())
            }))
            .at_least_times(0),
    )));
    let dispatcher = Arc::new(dispatcher(engine));
    let serving = dispatcher.clone();
    let request = tokio::spawn(async move { serving.execute(start(), Arc::new(context())).await });
    entered.notified().await;
    assert!(!stopped.load(Ordering::SeqCst));
    request.abort();
    assert!(request.await.unwrap_err().is_cancelled());
    dispatcher.drain().await;
    assert!(
        stopped.load(Ordering::SeqCst),
        "The cancelled start left the container running"
    );
}

#[tokio::test]
async fn start_waits_for_an_in_progress_stop() {
    let stopped = Arc::new(AtomicBool::new(false));
    let waited = stopped.clone();
    let engine = Arc::new(
        Unimock::new((
            EngineMock::inspect
                .some_call(matching!("box"))
                .returns(Ok(ContainerStatus::Stopping)),
            EngineMock::wait_stopped
                .some_call(matching!("box"))
                .answers_arc(Arc::new(move |_, _| {
                    waited.store(true, Ordering::SeqCst);
                    Ok(())
                })),
            EngineMock::start
                .some_call(matching!("box"))
                .answers_arc(Arc::new(move |_, _| {
                    if stopped.load(Ordering::SeqCst) {
                        Ok(())
                    } else {
                        Err(EngineError::Failed)
                    }
                })),
            EngineMock::write_environment
                .some_call(matching!("box", _))
                .answers(&|_, _, _| Box::pin(async { Ok(()) })),
            EngineMock::stop
                .some_call(matching!("box"))
                .answers(&|_, _| Ok(()))
                .at_least_times(0),
        ))
        .no_verify_in_drop(),
    );
    assert_eq!(
        dispatcher(engine)
            .execute(start(), Arc::new(context()))
            .await,
        running()
    );
}

#[tokio::test]
async fn get_unpauses_an_interrupted_save_and_reports_running() {
    let resumed = Arc::new(AtomicBool::new(false));
    let unpaused = resumed.clone();
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .some_call(matching!("box"))
            .returns(Ok(ContainerStatus::Paused)),
        EngineMock::unpause
            .some_call(matching!("box"))
            .answers_arc(Arc::new(move |_, _| {
                unpaused.store(true, Ordering::SeqCst);
                Ok(())
            }))
            .at_least_times(0),
    )));
    let op = ComputerOperation::ContainerGet {
        container: "box".into(),
    };
    assert_eq!(
        dispatcher(engine).execute(op, Arc::new(context())).await,
        running()
    );
    assert!(
        resumed.load(Ordering::SeqCst),
        "The container is still paused"
    );
}
