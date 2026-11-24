//! Container engine boundary used by all fixed operations.

use std::future::Future;
use std::path::Path;
use std::pin::Pin;

use async_trait::async_trait;
use cnd_runner_interface::computer::operations::ComputerRelease;
use cnd_runner_interface::computer::results::ContainerState;

use crate::settings::ServerUrl;

use super::error::EngineResult;

/// One cancelable environment file write.
pub type EnvironmentWrite<'a> = Pin<Box<dyn Future<Output = EngineResult<()>> + Send + 'a>>;

/// Container and image effects of the own computer.
#[cfg_attr(test, unimock::unimock(api = EngineMock))]
#[async_trait]
pub trait Engine: Send + Sync {
    /// Look up the state of the named Conductive container.
    async fn inspect(&self, name: &str) -> EngineResult<ContainerState>;
    /// Check for a local image by its complete reference.
    async fn image_exists(&self, image: &str) -> EngineResult<bool>;
    /// Create the container with resource limits, without starting it.
    async fn create(
        &self,
        name: &str,
        image: &str,
        cpus: u32,
        memory_bytes: u64,
    ) -> EngineResult<()>;
    /// Ask Podman to start the existing container.
    async fn start(&self, name: &str) -> EngineResult<()>;
    /// Set the environment file from standard input.
    fn write_environment<'a>(&'a self, name: &'a str, contents: Vec<u8>) -> EnvironmentWrite<'a>;
    /// Stop an existing container with a 30-second grace period.
    async fn stop(&self, name: &str) -> EngineResult<()>;
    /// Remove a container and its volumes. Missing containers succeed.
    async fn remove(&self, name: &str) -> EngineResult<()>;
    /// Commit the container to a local image, with a pause if it runs.
    async fn save(&self, name: &str, image: &str) -> EngineResult<()>;
    /// Load an authenticated archive, check the image ID, and assign its local tag.
    async fn load(&self, archive: &Path, image_id: &str, tag: &str) -> EngineResult<()>;
    /// Copy and run the pinned updater in the running container.
    async fn bootstrap(
        &self,
        name: &str,
        program: &Path,
        release: &ComputerRelease,
        server: &ServerUrl,
    ) -> EngineResult<()>;
}
