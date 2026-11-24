//! Image saves release their pause on error and cancellation.

#![expect(
    clippy::unwrap_used,
    reason = "The save fixture must report its cancellation."
)]

use std::future;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};

use cnd_runner_interface::computer::operations::ComputerOperation;
use cnd_runner_interface::computer::results::{ComputerErrorCode, ComputerResult};
use tokio::sync::Notify;
use unimock::{MockFn, Unimock, matching};

use crate::connection_support::context;
use crate::engine::error::EngineError;
use crate::engine::ports::{EngineMock, ImageSave};
use crate::engine::states::ContainerStatus;

use super::{Dispatcher, Operations};

fn image() -> ComputerOperation {
    ComputerOperation::ImageSave {
        container: "box".into(),
        image: "org".into(),
    }
}

fn fixture(
    paused: &Arc<AtomicBool>,
    commit: impl Fn() -> ImageSave<'static> + Send + Sync + 'static,
) -> Arc<Dispatcher> {
    let pause = paused.clone();
    let write = paused.clone();
    let unpause = paused.clone();
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .some_call(matching!("box"))
            .returns(Ok(ContainerStatus::Running)),
        EngineMock::image_exists
            .some_call(matching!("localhost/conductive/org-org"))
            .returns(Ok(false)),
        EngineMock::pause
            .some_call(matching!("box"))
            .answers_arc(Arc::new(move |_, _| {
                pause.store(true, Ordering::SeqCst);
                Ok(())
            })),
        EngineMock::save
            .some_call(matching!("box", "localhost/conductive/org-org"))
            .answers_arc(Arc::new(move |_, _, _| {
                assert!(
                    write.load(Ordering::SeqCst),
                    "The commit began before the pause"
                );
                commit()
            })),
        EngineMock::unpause
            .some_call(matching!("box"))
            .answers_arc(Arc::new(move |_, _| {
                unpause.store(false, Ordering::SeqCst);
                Ok(())
            })),
    )));
    let unused = Arc::new(Unimock::new(()));
    Arc::new(Dispatcher::new(
        engine,
        unused.clone(),
        unused.clone(),
        unused,
    ))
}

#[tokio::test]
async fn cancelled_save_resumes_the_container_after_the_commit_signal() {
    let paused = Arc::new(AtomicBool::new(false));
    let entered = Arc::new(Notify::new());
    let signal = entered.clone();
    let dispatcher = fixture(&paused, move || {
        signal.notify_one();
        Box::pin(future::pending())
    });
    let running = dispatcher.clone();
    let request = tokio::spawn(async move { running.execute(image(), Arc::new(context())).await });
    entered.notified().await;
    assert!(paused.load(Ordering::SeqCst));
    request.abort();
    assert!(request.await.unwrap_err().is_cancelled());
    dispatcher.drain().await;
    assert!(
        !paused.load(Ordering::SeqCst),
        "A cancelled save left the container paused"
    );
}

#[tokio::test]
async fn failed_commit_resumes_the_container_before_returning_the_error() {
    let paused = Arc::new(AtomicBool::new(false));
    let dispatcher = fixture(&paused, || Box::pin(async { Err(EngineError::NoSpace) }));
    let result = dispatcher.execute(image(), Arc::new(context())).await;
    assert_eq!(
        result,
        ComputerResult::Error {
            code: ComputerErrorCode::NoSpace
        }
    );
    assert!(
        !paused.load(Ordering::SeqCst),
        "A failed commit left the container paused"
    );
}
