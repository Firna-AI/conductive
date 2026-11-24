//! Fixed operations, quotas, and typed errors before and after the Podman boundary.

#![expect(clippy::unwrap_used, reason = "Fixture joins must succeed.")]

use std::future;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

use cnd_runner_interface::computer::operations::{
    ComputerOperation, ContainerEnvVar, ContainerImage,
};
use cnd_runner_interface::computer::results::{ComputerErrorCode, ComputerResult, ContainerState};
use futures_util::poll;
use tokio::sync::{Notify, oneshot};
use unimock::{MockFn, Unimock, matching};

use crate::connection_support::context;
use crate::diagnostics::DiagnosticsMock;
use crate::engine::error::EngineError;
use crate::engine::ports::{Engine, EngineMock};
use crate::engine::states::ContainerStatus;

use super::{Dispatcher, Operations};

const BOX: &str = "box";

fn create() -> ComputerOperation {
    ComputerOperation::ContainerCreate {
        container: BOX.into(),
        image: ContainerImage::Org {
            name: "main".into(),
        },
        env: vec![
            ContainerEnvVar {
                name: "VALUE".into(),
                value: "private".into(),
            },
            ContainerEnvVar {
                name: "non.shell".into(),
                value: "skip".into(),
            },
        ],
        cpus: 20,
        memory_bytes: 16_000_000_000,
    }
}

fn failed(code: ComputerErrorCode) -> ComputerResult {
    ComputerResult::Error { code }
}

fn state(state: ContainerState) -> ComputerResult {
    ComputerResult::Container {
        container: BOX.into(),
        state,
    }
}

async fn run(engine: Arc<dyn Engine>, operation: ComputerOperation) -> ComputerResult {
    Dispatcher::new(
        engine,
        Arc::new(Unimock::new(())),
        Arc::new(Unimock::new(())),
        Arc::new(Unimock::new(())),
    )
    .execute(operation, Arc::new(context()))
    .await
}

#[tokio::test]
async fn creates_starts_and_writes_environment_with_server_resource_caps() {
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .next_call(matching!("box"))
            .returns(Ok(ContainerStatus::Missing)),
        EngineMock::image_exists
            .next_call(matching!("localhost/conductive/org-main"))
            .returns(Ok(true)),
        EngineMock::create
            .next_call(matching!(
                "box",
                "localhost/conductive/org-main",
                4,
                8_000_000_000
            ))
            .returns(Ok(())),
        EngineMock::start
            .next_call(matching!("box"))
            .returns(Ok(())),
        EngineMock::write_environment
            .next_call(matching!(("box", data) if data == b"export 'VALUE=private'\n"))
            .answers(&|_, _, _| Box::pin(async { Ok(()) })),
    )));
    let diagnostics = Arc::new(Unimock::new(
        DiagnosticsMock::environment_omitted
            .some_call(matching!(1))
            .returns(()),
    ));
    let dispatcher = Dispatcher::new(
        engine,
        Arc::new(Unimock::new(())),
        Arc::new(Unimock::new(())),
        diagnostics,
    );
    assert_eq!(
        dispatcher.execute(create(), Arc::new(context())).await,
        state(ContainerState::Running)
    );
}

#[tokio::test]
async fn refuses_an_existing_container_or_missing_org_image() {
    let engine = Arc::new(Unimock::new(
        EngineMock::inspect
            .some_call(matching!("box"))
            .returns(Ok(ContainerStatus::Stopped)),
    ));
    assert_eq!(
        run(engine, create()).await,
        failed(ComputerErrorCode::AlreadyExists)
    );
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .some_call(matching!("box"))
            .returns(Ok(ContainerStatus::Missing)),
        EngineMock::image_exists
            .some_call(matching!("localhost/conductive/org-main"))
            .returns(Ok(false)),
    )));
    assert_eq!(
        run(engine, create()).await,
        failed(ComputerErrorCode::NotFound)
    );
}

#[tokio::test]
async fn a_failure_after_create_removes_the_container_and_returns_the_failure() {
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .next_call(matching!("box"))
            .returns(Ok(ContainerStatus::Missing)),
        EngineMock::image_exists
            .next_call(matching!("localhost/conductive/org-main"))
            .returns(Ok(true)),
        EngineMock::create
            .next_call(matching!(
                "box",
                "localhost/conductive/org-main",
                4,
                8_000_000_000
            ))
            .returns(Ok(())),
        EngineMock::start
            .next_call(matching!("box"))
            .returns(Err(EngineError::NoSpace)),
        EngineMock::remove
            .next_call(matching!("box"))
            .returns(Ok(())),
    )));
    assert_eq!(
        run(engine, create()).await,
        failed(ComputerErrorCode::NoSpace)
    );
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn a_cancelled_create_holds_the_name_until_cleanup() {
    let writing = Arc::new(Notify::new());
    let begun = writing.clone();
    let removing = Arc::new(Notify::new());
    let removal_started = removing.clone();
    let (release_removal, finish_removal) = oneshot::channel();
    let finish_removal = Mutex::new(Some(finish_removal));
    let removed = Arc::new(AtomicBool::new(false));
    let cleaned = removed.clone();
    let engine = Unimock::new((
        EngineMock::inspect.stub(|each| {
            each.call(matching!("box"))
                .answers(&|_, _| Ok(ContainerStatus::Missing))
                .once()
                .then()
                .answers_arc(Arc::new(move |_, _| {
                    Ok(if removed.load(Ordering::SeqCst) {
                        ContainerStatus::Missing
                    } else {
                        ContainerStatus::Running
                    })
                }))
                .once();
        }),
        EngineMock::image_exists
            .some_call(matching!("localhost/conductive/org-main"))
            .returns(Ok(true)),
        EngineMock::create
            .some_call(matching!(
                "box",
                "localhost/conductive/org-main",
                4,
                8_000_000_000
            ))
            .returns(Ok(())),
        EngineMock::start
            .some_call(matching!("box"))
            .returns(Ok(())),
        EngineMock::write_environment
            .some_call(matching!("box", _))
            .answers_arc(Arc::new(move |_, _, _| {
                begun.notify_one();
                Box::pin(future::pending())
            })),
        EngineMock::remove
            .some_call(matching!("box"))
            .answers_arc(Arc::new(move |_, _| {
                let finish = finish_removal.lock().unwrap().take().unwrap();
                removal_started.notify_one();
                if tokio::task::block_in_place(|| finish.blocking_recv()).is_ok() {
                    cleaned.store(true, Ordering::SeqCst);
                }
                Ok(())
            })),
    ));
    let diagnostics = Unimock::new(
        DiagnosticsMock::environment_omitted
            .some_call(matching!(1))
            .returns(()),
    );
    let dispatcher = Arc::new(Dispatcher::new(
        Arc::new(engine.clone()),
        Arc::new(Unimock::new(())),
        Arc::new(Unimock::new(())),
        Arc::new(diagnostics.clone()),
    ));
    let first = dispatcher.clone();
    let request = tokio::spawn(async move { first.execute(create(), Arc::new(context())).await });
    writing.notified().await;
    let next = dispatcher.execute(
        ComputerOperation::ContainerGet {
            container: BOX.into(),
        },
        Arc::new(context()),
    );
    tokio::pin!(next);
    assert!(poll!(&mut next).is_pending());
    request.abort();
    assert!(request.await.unwrap_err().is_cancelled());
    removing.notified().await;
    assert!(poll!(&mut next).is_pending(), "Get finished during removal");
    release_removal.send(()).unwrap();
    assert_eq!(next.await, state(ContainerState::Missing));
    dispatcher.drain().await;
}
