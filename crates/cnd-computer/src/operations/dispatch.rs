//! Validate each operation before it reaches the local container engine.

use std::sync::Arc;

use cnd_runner_interface::computer::operations::{
    ComputerOperation, ComputerRelease, ContainerEnvVar, ContainerImage,
};
use cnd_runner_interface::computer::results::{ComputerErrorCode, ComputerResult, ContainerState};
use tokio::sync::OwnedMutexGuard;

use crate::diagnostics::Diagnostics;
use crate::engine::error::EngineError;
use crate::engine::ports::Engine;
use crate::error::{self, Error};
use crate::releases::ports::{BaseImages, Releases};

use super::cleanup::Cleanup;
use super::environment::render;
use super::names::{Names, org_image};
use super::validation::{container_name, validate};
use super::{OperationFuture, Operations, RequestContext, WaitForCleanup};

type Result<T> = std::result::Result<T, ComputerErrorCode>;

/// Dispatches fixed operations and serializes work on each container and image.
pub struct Dispatcher {
    engine: Arc<dyn Engine>,
    releases: Arc<dyn Releases>,
    bases: Arc<dyn BaseImages>,
    diagnostics: Arc<dyn Diagnostics>,
    containers: Names,
    images: Names,
    cleanup: Arc<Cleanup>,
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
                self.create(request, context, lock).await
            }
            ComputerOperation::ContainerGet { container } => {
                let state = engine(self.engine.inspect(&container).await)?;
                Ok(container_state(container, state))
            }
            ComputerOperation::ContainerStart { container, env } => {
                if self.existing(&container).await? == ContainerState::Stopped {
                    engine(self.engine.start(&container).await)?;
                }
                self.write_environment(&container, &env).await?;
                Ok(container_state(container, ContainerState::Running))
            }
            ComputerOperation::ContainerStop { container } => {
                self.existing(&container).await?;
                engine(self.engine.stop(&container).await)?;
                Ok(container_state(container, ContainerState::Stopped))
            }
            ComputerOperation::ContainerDelete { container } => {
                engine(self.engine.remove(&container).await)?;
                Ok(ComputerResult::ContainerDeleted { container })
            }
            ComputerOperation::ImageSave { container, image } => self.save(&container, image).await,
            ComputerOperation::ContainerBootstrap { container, release } => {
                self.bootstrap(container, release, context).await
            }
        }
    }

    async fn create(
        &self,
        request: Create,
        context: &RequestContext,
        lock: OwnedMutexGuard<()>,
    ) -> Result<ComputerResult> {
        let Create {
            container,
            image,
            env,
            cpus,
            memory_bytes,
        } = request;
        if engine(self.engine.inspect(&container).await)? != ContainerState::Missing {
            return Err(ComputerErrorCode::AlreadyExists);
        }
        let image = match image {
            ContainerImage::Org { name } => {
                let image = org_image(&name);
                if !engine(self.engine.image_exists(&image).await)? {
                    return Err(ComputerErrorCode::NotFound);
                }
                image
            }
            ContainerImage::Base { release } => {
                released(self.bases.ensure(&context.release_server, &release).await)?
            }
        };
        let mut rollback = self.cleanup.created(container.clone(), lock);
        let created = engine(
            self.engine
                .create(
                    &container,
                    &image,
                    cpus.min(context.resources.cpus),
                    memory_bytes.min(context.resources.memory_bytes),
                )
                .await,
        );
        let result = async {
            created?;
            engine(self.engine.start(&container).await)?;
            self.write_environment(&container, &env).await
        }
        .await;
        if result.is_ok() || created == Err(ComputerErrorCode::AlreadyExists) {
            rollback.disarm();
        } else {
            rollback.remove().await;
        }
        result?;
        Ok(container_state(container, ContainerState::Running))
    }

    async fn save(&self, container: &str, image: String) -> Result<ComputerResult> {
        self.existing(container).await?;
        let tag = org_image(&image);
        let _lock = self.images.lock(&tag).await;
        if engine(self.engine.image_exists(&tag).await)? {
            return Err(ComputerErrorCode::AlreadyExists);
        }
        engine(self.engine.save(container, &tag).await)?;
        Ok(ComputerResult::ImageSaved { image })
    }

    async fn bootstrap(
        &self,
        container: String,
        release: ComputerRelease,
        context: &RequestContext,
    ) -> Result<ComputerResult> {
        if self.existing(&container).await? == ContainerState::Stopped {
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

    async fn existing(&self, name: &str) -> Result<ContainerState> {
        let state = engine(self.engine.inspect(name).await)?;
        if state == ContainerState::Missing {
            return Err(ComputerErrorCode::NotFound);
        }
        Ok(state)
    }

    async fn write_environment(&self, name: &str, env: &[ContainerEnvVar]) -> Result<()> {
        let (contents, omitted) = render(env);
        if omitted != 0 {
            self.diagnostics.environment_omitted(omitted);
        }
        engine(self.engine.write_environment(name, contents).await)
    }
}

struct Create {
    container: String,
    image: ContainerImage,
    env: Vec<ContainerEnvVar>,
    cpus: u32,
    memory_bytes: u64,
}

fn container_state(container: String, state: ContainerState) -> ComputerResult {
    ComputerResult::Container { container, state }
}

fn engine<T>(result: std::result::Result<T, EngineError>) -> Result<T> {
    match result {
        Ok(value) => Ok(value),
        Err(EngineError::NotFound) => Err(ComputerErrorCode::NotFound),
        Err(EngineError::AlreadyExists) => Err(ComputerErrorCode::AlreadyExists),
        Err(EngineError::NoSpace) => Err(ComputerErrorCode::NoSpace),
        Err(_) => Err(ComputerErrorCode::Internal),
    }
}

fn released<T>(result: error::Result<T>) -> Result<T> {
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
