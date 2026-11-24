//! Validate each operation before it reaches the local container engine.

use std::sync::Arc;

use cnd_runner_interface::computer::operations::{
    ComputerOperation, ComputerRelease, ContainerEnvVar,
};
use cnd_runner_interface::computer::results::{ComputerErrorCode, ComputerResult, ContainerState};

use crate::diagnostics::Diagnostics;
use crate::engine::error::EngineError;
use crate::engine::ports::Engine;
use crate::engine::states::ContainerStatus;
use crate::error::{self, Error};
use crate::releases::ports::{BaseImages, Releases};

use super::changes::Create;
use super::cleanup::Cleanup;
use super::environment::render;
use super::names::Names;
use super::validation::{container_name, validate};
use super::{OperationFuture, Operations, RequestContext, WaitForCleanup};

pub(super) type Result<T> = std::result::Result<T, ComputerErrorCode>;

/// Dispatches fixed operations and serializes work on each container and image.
pub struct Dispatcher {
    pub(super) engine: Arc<dyn Engine>,
    releases: Arc<dyn Releases>,
    pub(super) bases: Arc<dyn BaseImages>,
    diagnostics: Arc<dyn Diagnostics>,
    containers: Names,
    pub(super) images: Names,
    pub(super) cleanup: Arc<Cleanup>,
}

impl Dispatcher {
    /// Use one engine for every connection of the service.
    pub fn new(
        engine: Arc<dyn Engine>,
        releases: Arc<dyn Releases>,
        bases: Arc<dyn BaseImages>,
        diagnostics: Arc<dyn Diagnostics>,
    ) -> Self {
        Self {
            cleanup: Arc::new(Cleanup::new(engine.clone(), diagnostics.clone())),
            engine,
            releases,
            bases,
            diagnostics,
            containers: Names::default(),
            images: Names::default(),
        }
    }
}

impl Operations for Dispatcher {
    fn execute(
        &self,
        operation: ComputerOperation,
        context: Arc<RequestContext>,
    ) -> OperationFuture<'_> {
        Box::pin(async move {
            match self.dispatch(operation, &context).await {
                Ok(result) => result,
                Err(code) => ComputerResult::Error { code },
            }
        })
    }

    fn drain(&self) -> WaitForCleanup<'_> {
        Box::pin(self.cleanup.drain())
    }
}

impl Dispatcher {
    async fn dispatch(
        &self,
        operation: ComputerOperation,
        context: &RequestContext,
    ) -> Result<ComputerResult> {
        let name = container_name(&operation);
        if !validate(name, &operation) {
            return Err(ComputerErrorCode::InvalidRequest);
        }
        let lock = self.containers.lock(name).await;
        let status = self.inspect(name).await?;
        match operation {
            ComputerOperation::ContainerCreate {
                container,
                image,
                env,
                cpus,
                memory_bytes,
            } => {
                let request = Create {
                    container,
                    image,
                    env,
                    cpus,
                    memory_bytes,
                };
                self.create(request, context, lock, status).await
            }
            ComputerOperation::ContainerGet { container } => {
                let state = match status {
                    ContainerStatus::Missing | ContainerStatus::Removing => ContainerState::Missing,
                    ContainerStatus::Stopped | ContainerStatus::Stopping => ContainerState::Stopped,
                    ContainerStatus::Running => ContainerState::Running,
                    ContainerStatus::Paused => return Err(ComputerErrorCode::Internal),
                };
                Ok(container_state(container, state))
            }
            ComputerOperation::ContainerStart { container, env } => {
                self.start(container, &env, lock, existing(status)?).await
            }
            ComputerOperation::ContainerStop { container } => {
                self.stop(container, existing(status)?).await
            }
            ComputerOperation::ContainerDelete { container } => {
                engine(self.engine.remove(&container).await)?;
                Ok(ComputerResult::ContainerDeleted { container })
            }
            ComputerOperation::ImageSave { container, image } => {
                self.save(&container, image, lock, existing(status)?).await
            }
            ComputerOperation::ContainerBootstrap { container, release } => {
                self.bootstrap(container, release, context, existing(status)?)
                    .await
            }
        }
    }

    async fn bootstrap(
        &self,
        container: String,
        release: ComputerRelease,
        context: &RequestContext,
        status: ContainerStatus,
    ) -> Result<ComputerResult> {
        if status != ContainerStatus::Running {
            return Err(ComputerErrorCode::InvalidRequest);
        }
        let program = released(
            self.releases
                .program(&context.release_server, &release)
                .await,
        )?;
        if self
            .engine
            .bootstrap(&container, &program, &release, &context.release_server)
            .await
            .is_err()
        {
            return Err(ComputerErrorCode::Internal);
        }
        Ok(ComputerResult::ContainerBootstrapped {
            container,
            version: release.version,
        })
    }

    async fn inspect(&self, name: &str) -> Result<ContainerStatus> {
        let status = engine(self.engine.inspect(name).await)?;
        if status == ContainerStatus::Paused {
            engine(self.engine.unpause(name).await)?;
            return Ok(ContainerStatus::Running);
        }
        Ok(status)
    }

    pub(super) async fn write_environment(
        &self,
        name: &str,
        env: &[ContainerEnvVar],
    ) -> Result<()> {
        let (contents, omitted) = render(env);
        if omitted != 0 {
            self.diagnostics.environment_omitted(omitted);
        }
        engine(self.engine.write_environment(name, contents).await)
    }
}

fn existing(status: ContainerStatus) -> Result<ContainerStatus> {
    match status {
        ContainerStatus::Missing | ContainerStatus::Removing => Err(ComputerErrorCode::NotFound),
        _ => Ok(status),
    }
}

pub(super) fn container_state(container: String, state: ContainerState) -> ComputerResult {
    ComputerResult::Container { container, state }
}

pub(super) fn engine<T>(result: std::result::Result<T, EngineError>) -> Result<T> {
    match result {
        Ok(value) => Ok(value),
        Err(EngineError::NotFound) => Err(ComputerErrorCode::NotFound),
        Err(EngineError::AlreadyExists) => Err(ComputerErrorCode::AlreadyExists),
        Err(EngineError::NoSpace) => Err(ComputerErrorCode::NoSpace),
        Err(_) => Err(ComputerErrorCode::Internal),
    }
}

pub(super) fn released<T>(result: error::Result<T>) -> Result<T> {
    match result {
        Ok(value) => Ok(value),
        Err(Error::ReleaseInvalid) => Err(ComputerErrorCode::ReleaseInvalid),
        Err(Error::ReleaseUnavailable) => Err(ComputerErrorCode::ReleaseUnavailable),
        Err(Error::NoSpace) => Err(ComputerErrorCode::NoSpace),
        Err(_) => Err(ComputerErrorCode::Internal),
    }
}

#[cfg(test)]
#[path = "_tests_/dispatch_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "_tests_/container_tests.rs"]
mod container_tests;

#[cfg(test)]
#[path = "_tests_/release_tests.rs"]
mod release_tests;

#[cfg(test)]
#[path = "_tests_/transition_tests.rs"]
mod transition_tests;

#[cfg(test)]
#[path = "_tests_/save_tests.rs"]
mod save_tests;
