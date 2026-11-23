//! Replaceable local socket and per-connection stream boundaries.

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::host::literals::HostStreamPort;
use cnd_runner_interface::host::results::HostResult;

use crate::error::Result;
use crate::ports::Socket;

/// One local socket with independent read and write halves.
#[cfg_attr(test, unimock::unimock(api = LocalSocketMock))]
#[async_trait]
pub trait LocalSocket: Send + Sync {
    /// Read at most the available credit. Empty means local EOF.
    async fn read(&self, maximum: usize) -> Result<Vec<u8>>;
    /// Hand received stream bytes to the local socket.
    async fn write(&self, bytes: &[u8]) -> Result<()>;
    /// Half-close the local socket's write direction.
    async fn end(&self) -> Result<()>;
}

/// Asynchronous result of opening one permitted local socket.
pub type Connection<'a> = Pin<Box<dyn Future<Output = Result<Arc<dyn LocalSocket>>> + Send + 'a>>;

/// Fixed-port loopback socket factory.
#[cfg_attr(test, unimock::unimock(api = NetworkMock))]
pub trait Network: Send + Sync {
    /// Connect to 127.0.0.1 on the permitted port.
    fn connect(&self, port: HostStreamPort) -> Connection<'_>;
}

/// One connection's stream table and all its stream tasks.
#[cfg_attr(test, unimock::unimock(api = StreamsMock))]
#[async_trait]
pub trait Streams: Send + Sync {
    /// Reserve and connect a stream, without sending data before its reply.
    async fn open(&self, stream_id: u32, port: HostStreamPort) -> Result<HostResult>;
    /// Start local reads after stream.opened has left the host socket.
    async fn activate(&self, stream_id: u32);
    /// Validate receive credit before queueing data for the local socket.
    async fn data(&self, stream_id: u32, bytes: Vec<u8>) -> Result<()>;
    /// Add credit for outgoing local bytes.
    async fn credit(&self, stream_id: u32, bytes: u32) -> Result<()>;
    /// Half-close the local write direction.
    async fn end(&self, stream_id: u32) -> Result<()>;
    /// End both directions and release one stream.
    async fn close(&self, stream_id: u32);
    /// Abort and join all stream tasks when the host connection drops.
    async fn close_all(&self);
}

/// Create a fresh stream table for each connection.
#[cfg_attr(test, unimock::unimock(api = StreamFactoryMock))]
pub trait StreamFactory: Send + Sync {
    /// Bind stream traffic to the current host socket only.
    fn create(&self, socket: Arc<dyn Socket>) -> Arc<dyn Streams>;
}
