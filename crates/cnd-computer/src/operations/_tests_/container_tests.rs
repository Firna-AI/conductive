//! Get, start, stop, delete, save, and rejected arguments.

use std::sync::Arc;

use cnd_runner_interface::computer::operations::{
    ComputerOperation, ComputerRelease, ContainerEnvVar,
};
use cnd_runner_interface::computer::results::{ComputerErrorCode, ComputerResult, ContainerState};
use unimock::{MockFn, Unimock, matching};

use crate::connection_support::context;
use crate::engine::ports::{Engine, EngineMock};
use crate::engine::states::ContainerStatus;

use super::{Dispatcher, Operations};

fn error(code: ComputerErrorCode) -> ComputerResult {
    ComputerResult::Error { code }
}

fn result(state: ContainerState) -> ComputerResult {
    ComputerResult::Container {
        container: "box".into(),
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

fn start() -> ComputerOperation {
    ComputerOperation::ContainerStart {
        container: "box".into(),
        env: Vec::new(),
    }
}

fn stop() -> ComputerOperation {
    ComputerOperation::ContainerStop {
        container: "box".into(),
    }
}

fn save() -> ComputerOperation {
    ComputerOperation::ImageSave {
        container: "box".into(),
        image: "org".into(),
    }
}

fn bootstrap() -> ComputerOperation {
    ComputerOperation::ContainerBootstrap {
        container: "box".into(),
        release: ComputerRelease {
            version: "0.0.42".into(),
            digest: "b".repeat(64),
        },
    }
}

#[tokio::test]
async fn reports_missing_and_deletes_idempotently() {
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .some_call(matching!("box"))
            .answers(&|_, _| Ok(ContainerStatus::Missing))
            .n_times(2),
        EngineMock::remove
            .some_call(matching!("box"))
            .returns(Ok(())),
    )));
    assert_eq!(
        run(
            engine.clone(),
            ComputerOperation::ContainerGet {
                container: "box".into()
            }
        )
        .await,
        result(ContainerState::Missing)
    );
    assert_eq!(
        run(
            engine,
            ComputerOperation::ContainerDelete {
                container: "box".into()
            }
        )
        .await,
        ComputerResult::ContainerDeleted {
            container: "box".into()
        }
    );
}

#[tokio::test]
async fn starting_a_stopped_container_starts_it_before_the_env_write() {
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .next_call(matching!("box"))
            .returns(Ok(ContainerStatus::Stopped)),
        EngineMock::start
            .next_call(matching!("box"))
            .returns(Ok(())),
        EngineMock::write_environment
            .next_call(matching!(("box", data) if data.is_empty()))
            .answers(&|_, _, _| Box::pin(async { Ok(()) })),
    )));
    assert_eq!(run(engine, start()).await, result(ContainerState::Running));
}

#[tokio::test]
async fn starting_a_running_container_refreshes_the_env_without_a_restart() {
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .some_call(matching!("box"))
            .returns(Ok(ContainerStatus::Running)),
        EngineMock::write_environment
            .some_call(matching!("box", _))
            .answers(&|_, _, _| Box::pin(async { Ok(()) })),
    )));
    assert_eq!(run(engine, start()).await, result(ContainerState::Running));
}

#[tokio::test]
async fn stops_an_existing_container() {
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .next_call(matching!("box"))
            .returns(Ok(ContainerStatus::Running)),
        EngineMock::stop.next_call(matching!("box")).returns(Ok(())),
    )));
    assert_eq!(run(engine, stop()).await, result(ContainerState::Stopped));
}

#[tokio::test]
async fn start_stop_save_and_bootstrap_reject_a_missing_container() {
    let engine = Arc::new(Unimock::new(
        EngineMock::inspect
            .some_call(matching!("box"))
            .answers(&|_, _| Ok(ContainerStatus::Missing))
            .n_times(4),
    ));
    for operation in [start(), stop(), save(), bootstrap()] {
        assert_eq!(
            run(engine.clone(), operation).await,
            error(ComputerErrorCode::NotFound)
        );
    }
}

#[tokio::test]
async fn bootstrap_rejects_a_stopped_container() {
    let engine = Arc::new(Unimock::new(
        EngineMock::inspect
            .some_call(matching!("box"))
            .returns(Ok(ContainerStatus::Stopped)),
    ));
    assert_eq!(
        run(engine, bootstrap()).await,
        error(ComputerErrorCode::InvalidRequest)
    );
}

#[tokio::test]
async fn saves_a_new_image_and_refuses_to_overwrite_it() {
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .some_call(matching!("box"))
            .answers(&|_, _| Ok(ContainerStatus::Running))
            .n_times(2),
        EngineMock::image_exists.stub(|each| {
            each.call(matching!("localhost/conductive/org-org"))
                .answers(&|_, _| Ok(false))
                .once()
                .then()
                .answers(&|_, _| Ok(true))
                .once();
        }),
        EngineMock::pause
            .next_call(matching!("box"))
            .returns(Ok(())),
        EngineMock::save
            .next_call(matching!("box", "localhost/conductive/org-org"))
            .answers(&|_, _, _| Box::pin(async { Ok(()) })),
        EngineMock::unpause
            .next_call(matching!("box"))
            .returns(Ok(())),
    )));
    let dispatcher = Dispatcher::new(
        engine,
        Arc::new(Unimock::new(())),
        Arc::new(Unimock::new(())),
        Arc::new(Unimock::new(())),
    );
    assert_eq!(
        dispatcher.execute(save(), Arc::new(context())).await,
        ComputerResult::ImageSaved {
            image: "org".into()
        }
    );
    assert_eq!(
        dispatcher.execute(save(), Arc::new(context())).await,
        error(ComputerErrorCode::AlreadyExists)
    );
}

#[tokio::test]
async fn invalid_arguments_do_not_reach_the_engine() {
    let engine = Arc::new(Unimock::new(()));
    for operation in [
        ComputerOperation::ContainerDelete {
            container: "../box".into(),
        },
        ComputerOperation::ContainerStart {
            container: "box".into(),
            env: vec![ContainerEnvVar {
                name: "A=B".into(),
                value: "private".into(),
            }],
        },
        ComputerOperation::ContainerBootstrap {
            container: "box".into(),
            release: ComputerRelease {
                version: "../illegal".into(),
                digest: "a".repeat(64),
            },
        },
    ] {
        assert_eq!(
            run(engine.clone(), operation).await,
            error(ComputerErrorCode::InvalidRequest)
        );
    }
}
