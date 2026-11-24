//! Replaceable time, settings, socket, command, and filesystem boundaries.

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use cnd_runner_interface::host::messages::{HostToWorker, WorkerToHost};
use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::HostResult;

use crate::config::ConnectionRequest;
use crate::error::Result;

/// Time and random retry jitter.
#[cfg_attr(test, unimock::unimock(api = ClockMock))]
pub trait Clock: Send + Sync {
    /// Wait without blocking the executor.
    fn wait(&self, duration: Duration) -> Pin<Box<dyn Future<Output = ()> + Send>>;
    /// Add zero through twenty percent of the base wait, in milliseconds.
    fn jitter(&self, base: Duration) -> Duration;
}

/// Saved machine credentials, read again before each connection attempt.
#[cfg_attr(test, unimock::unimock(api = ConfigurationMock))]
#[async_trait]
pub trait Configuration: Send + Sync {
    /// Missing settings return None, without changing the process environment.
    async fn read(&self) -> Result<Option<ConnectionRequest>>;
}

/// One decoded inbound frame. Activity includes WebSocket control frames.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Incoming {
    /// One complete typed text message.
    Message(WorkerToHost),
    /// Data for one local stream.
    Data {
        /// Stream identity.
        stream_id: u32,
        /// Raw bytes, never decoded as text.
        data: Vec<u8>,
    },
    /// A control frame or an incomplete message part.
    Activity,
    /// The peer closed the connection, possibly with a protocol close code.
    Closed(Option<u16>),
}

/// One socket, with independent receive and send halves.
#[cfg_attr(test, unimock::unimock(api = SocketMock))]
#[async_trait]
pub trait Socket: Send + Sync {
    /// Send compact JSON, using message parts above the part limit.
    async fn send(&self, message: &HostToWorker) -> Result<()>;
    /// Send a bounded binary stream frame.
    async fn data(&self, stream_id: u32, data: Vec<u8>) -> Result<()>;
    /// Receive one frame, preserving activity while assembling message parts.
    fn receive(&self) -> Pin<Box<dyn Future<Output = Result<Incoming>> + Send + '_>>;
    /// Close the connection with a fixed protocol code.
    async fn close(&self, code: u16) -> Result<()>;
}

/// TLS socket factory. Refused upgrades are ordinary connection failures.
#[cfg_attr(test, unimock::unimock(api = ConnectorMock))]
pub trait Connector: Send + Sync {
    /// Open an authenticated outbound host connection.
    fn connect<'a>(&'a self, request: &'a ConnectionRequest) -> SocketConnection<'a>;
}

/// Pending host connection, cancelled by the runtime's attempt deadline.
pub type SocketConnection<'a> = Pin<Box<dyn Future<Output = Result<Arc<dyn Socket>>> + Send + 'a>>;

/// Pending operation, which may be cancelled by its enclosing deadline.
pub type OperationFuture<'a> = Pin<Box<dyn Future<Output = Result<HostResult>> + Send + 'a>>;

/// Operations other than streams, which belong to one connection.
#[cfg_attr(test, unimock::unimock(api = OperationsMock))]
pub trait Operations: Send + Sync {
    /// Validate and execute one command or file operation.
    fn execute(&self, operation: HostOperation) -> OperationFuture<'_>;
}

/// Commands and their runtime records outlive an individual connection.
#[cfg_attr(test, unimock::unimock(api = CommandsMock))]
#[async_trait]
pub trait Commands: Send + Sync {
    /// Run a clean-environment command with its process-group timeout.
    async fn run(&self, command: &str, timeout_seconds: u32) -> Result<HostResult>;
    /// Start a detached command and retain its output under runtime storage.
    async fn start(&self, command: &str) -> Result<HostResult>;
    /// Read detached output from raw byte offsets.
    async fn status(
        &self,
        process_id: u64,
        stdout_offset: u64,
        stderr_offset: u64,
    ) -> Result<HostResult>;
}

/// Absolute-path file access as the sandbox user.
#[cfg_attr(test, unimock::unimock(api = FilesMock))]
#[async_trait]
pub trait Files: Send + Sync {
    /// Read metadata, following links.
    async fn info(&self, path: &str) -> Result<HostResult>;
    /// Read at most the caller's raw byte limit, returning base64.
    async fn read(&self, path: &str, max_bytes: u64) -> Result<HostResult>;
}
