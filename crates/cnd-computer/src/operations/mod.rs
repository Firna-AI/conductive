//! Fixed operation dispatch and per-connection resource limits.

mod changes;
mod cleanup;
pub mod dispatch;
pub mod environment;
mod names;
mod validation;

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use cnd_runner_interface::computer::messages::ComputerResources;
use cnd_runner_interface::computer::operations::ComputerOperation;
use cnd_runner_interface::computer::results::ComputerResult;

use crate::settings::ServerUrl;

/// Settings and capacities announced on this connection.
#[derive(Debug, Clone)]
pub struct RequestContext {
    /// Server resource limits reported to the Worker.
    pub resources: ComputerResources,
    /// Source of signed programs and base images.
    pub release_server: ServerUrl,
}

/// A request future that owns its native operation until completion or cancellation.
pub type OperationFuture<'a> = Pin<Box<dyn Future<Output = ComputerResult> + Send + 'a>>;

/// A wait for cleanup from aborted container operations.
pub type WaitForCleanup<'a> = Pin<Box<dyn Future<Output = ()> + Send + 'a>>;

/// Execute fixed operations from the authenticated Worker.
#[cfg_attr(test, unimock::unimock(api = OperationsMock))]
pub trait Operations: Send + Sync {
    /// Run one operation. Dropping the future cancels its child process.
    fn execute(
        &self,
        operation: ComputerOperation,
        context: Arc<RequestContext>,
    ) -> OperationFuture<'_>;

    /// Wait for the cleanup of cancelled requests before the service exits.
    fn drain(&self) -> WaitForCleanup<'_> {
        Box::pin(async {})
    }
}
