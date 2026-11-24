//! Multi-step container changes with ownership of the lock through cleanup.

use cnd_runner_interface::computer::operations::{ContainerEnvVar, ContainerImage};
use cnd_runner_interface::computer::results::{ComputerErrorCode, ComputerResult, ContainerState};
use tokio::sync::OwnedMutexGuard;

use crate::engine::states::ContainerStatus;

use super::RequestContext;
use super::cleanup::Restore;
use super::dispatch::{Dispatcher, Result, container_state, engine, released};
use super::names::org_image;

pub(super) struct Create {
    pub(super) container: String,
    pub(super) image: ContainerImage,
    pub(super) env: Vec<ContainerEnvVar>,
    pub(super) cpus: u32,
    pub(super) memory_bytes: u64,
}

impl Dispatcher {
    pub(super) async fn create(
        &self,
        request: Create,
        context: &RequestContext,
        lock: OwnedMutexGuard<()>,
        status: ContainerStatus,
    ) -> Result<ComputerResult> {
        let Create {
            container,
            image,
            env,
            cpus,
            memory_bytes,
        } = request;
        if status != ContainerStatus::Missing {
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
        let mut rollback = self.cleanup.guard(container.clone(), lock, Restore::Remove);
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
            let _ = rollback.restore().await;
        }
        result?;
        Ok(container_state(container, ContainerState::Running))
    }

    pub(super) async fn start(
        &self,
        container: String,
        env: &[ContainerEnvVar],
        lock: OwnedMutexGuard<()>,
        status: ContainerStatus,
    ) -> Result<ComputerResult> {
        if status == ContainerStatus::Running {
            self.write_environment(&container, env).await?;
            return Ok(container_state(container, ContainerState::Running));
        }
        self.wait_if_stopping(&container, status).await?;
        let mut rollback = self.cleanup.guard(container.clone(), lock, Restore::Stop);
        let result = async {
            engine(self.engine.start(&container).await)?;
            self.write_environment(&container, env).await
        }
        .await;
        if result.is_ok() {
            rollback.disarm();
        } else {
            let _ = rollback.restore().await;
        }
        result?;
        Ok(container_state(container, ContainerState::Running))
    }

    pub(super) async fn stop(
        &self,
        container: String,
        status: ContainerStatus,
    ) -> Result<ComputerResult> {
        if status == ContainerStatus::Stopping {
            engine(self.engine.wait_stopped(&container).await)?;
        } else {
            engine(self.engine.stop(&container).await)?;
        }
        Ok(container_state(container, ContainerState::Stopped))
    }

    pub(super) async fn save(
        &self,
        container: &str,
        image: String,
        lock: OwnedMutexGuard<()>,
        status: ContainerStatus,
    ) -> Result<ComputerResult> {
        let tag = org_image(&image);
        let _image_lock = self.images.lock(&tag).await;
        if engine(self.engine.image_exists(&tag).await)? {
            return Err(ComputerErrorCode::AlreadyExists);
        }
        self.wait_if_stopping(container, status).await?;
        if status == ContainerStatus::Running {
            let mut rollback = self.cleanup.guard(container.into(), lock, Restore::Unpause);
            let committed = async {
                engine(self.engine.pause(container).await)?;
                engine(self.engine.save(container, &tag).await)
            }
            .await;
            let unpaused = engine(rollback.restore().await);
            committed?;
            unpaused?;
        } else {
            engine(self.engine.save(container, &tag).await)?;
        }
        Ok(ComputerResult::ImageSaved { image })
    }

    async fn wait_if_stopping(&self, container: &str, status: ContainerStatus) -> Result<()> {
        if status == ContainerStatus::Stopping {
            engine(self.engine.wait_stopped(container).await)?;
        }
        Ok(())
    }
}
