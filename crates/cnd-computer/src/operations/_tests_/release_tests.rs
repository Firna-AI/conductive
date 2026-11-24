//! Base image errors and the checked-program boundary of bootstrap.

use std::path::PathBuf;
use std::sync::Arc;

use cnd_runner_interface::computer::operations::{
    ComputerOperation, ComputerRelease, ContainerImage,
};
use cnd_runner_interface::computer::results::{ComputerErrorCode, ComputerResult, ContainerState};
use unimock::{MockFn, Unimock, matching};

use crate::connection_support::context;
use crate::engine::error::EngineError;
use crate::engine::ports::EngineMock;
use crate::error::Error;
use crate::releases::ports::{BaseImagesMock, ReleasesMock};

use super::{Dispatcher, Operations};

fn release() -> ComputerRelease {
    ComputerRelease {
        version: "0.0.46".into(),
        digest: "e".repeat(64),
    }
}

#[tokio::test]
async fn base_release_validation_failure_replies_with_its_fixed_code() {
    let engine = Arc::new(Unimock::new(
        EngineMock::inspect
            .some_call(matching!("box"))
            .returns(Ok(ContainerState::Missing)),
    ));
    let bases = Arc::new(Unimock::new(
        BaseImagesMock::ensure
            .some_call(matching!(_, _))
            .returns(Err(Error::ReleaseInvalid)),
    ));
    let dispatcher = Dispatcher::new(
        engine,
        Arc::new(Unimock::new(())),
        bases,
        Arc::new(Unimock::new(())),
    );
    let input = ComputerOperation::ContainerCreate {
        container: "box".into(),
        image: ContainerImage::Base { release: release() },
        env: Vec::new(),
        cpus: 1,
        memory_bytes: 1024,
    };
    assert_eq!(
        dispatcher.execute(input, Arc::new(context())).await,
        ComputerResult::Error {
            code: ComputerErrorCode::ReleaseInvalid
        },
    );
}

#[tokio::test]
async fn bootstraps_the_requested_release_and_hides_in_container_failures() {
    let engine = Arc::new(Unimock::new((
        EngineMock::inspect
            .some_call(matching!("box"))
            .answers(&|_, _| Ok(ContainerState::Running))
            .n_times(2),
        EngineMock::bootstrap.stub(|each| {
            each.call(matching!(("box", path, identity, server) if
                path.to_str() == Some("/fixture/conductive")
                    && **identity == release()
                    && server.as_str() == "https://runner.conductive.build"))
                .answers(&|_, _, _, _, _| Ok(()))
                .once()
                .then()
                .answers(&|_, _, _, _, _| Err(EngineError::NotFound))
                .once();
        }),
    )));
    let releases = Arc::new(Unimock::new(
        ReleasesMock::program
            .some_call(matching!((server, identity) if
            server.as_str() == "https://runner.conductive.build" && **identity == release()))
            .answers(&|_, _, _| Ok(PathBuf::from("/fixture/conductive")))
            .n_times(2),
    ));
    let dispatcher = Dispatcher::new(
        engine,
        releases,
        Arc::new(Unimock::new(())),
        Arc::new(Unimock::new(())),
    );
    let input = ComputerOperation::ContainerBootstrap {
        container: "box".into(),
        release: release(),
    };
    let expected = ComputerResult::ContainerBootstrapped {
        container: "box".into(),
        version: "0.0.46".into(),
    };
    assert_eq!(
        dispatcher.execute(input.clone(), Arc::new(context())).await,
        expected
    );
    assert_eq!(
        dispatcher.execute(input, Arc::new(context())).await,
        ComputerResult::Error {
            code: ComputerErrorCode::Internal
        },
    );
}
