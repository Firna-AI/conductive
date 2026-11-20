//! Loopback-only listener with close-on-exec sockets owned by Tokio.

use std::net::SocketAddr;

use async_trait::async_trait;
use tokio::io::{AsyncRead, AsyncWrite};
use tokio::net::TcpListener;

use crate::error::{ErrorResultExt, Result};

/// Transport accepted by the file server.
pub trait Socket: AsyncRead + AsyncWrite + Unpin + Send {}
impl<T: AsyncRead + AsyncWrite + Unpin + Send> Socket for T {}

/// Listening boundary for the HTTP service.
#[cfg_attr(test, unimock::unimock(api = ListenerMock))]
#[async_trait]
pub trait Listener: Send + Sync {
    /// Accept one local connection.
    async fn accept(&self) -> Result<Box<dyn Socket>>;
}

/// A socket bound only to the IPv4 loopback interface.
pub struct LoopbackListener(TcpListener);

impl LoopbackListener {
    /// Bind the reserved port, or port zero for isolated integration tests.
    pub async fn bind(port: u16) -> Result<Self> {
        Ok(Self(
            TcpListener::bind(("127.0.0.1", port)).await.internal()?,
        ))
    }

    /// Bound address, including the selected port when zero was requested.
    pub fn address(&self) -> Result<SocketAddr> {
        self.0.local_addr().internal()
    }
}

#[async_trait]
impl Listener for LoopbackListener {
    async fn accept(&self) -> Result<Box<dyn Socket>> {
        loop {
            let (stream, peer) = self.0.accept().await.internal()?;
            if peer.ip().is_loopback() {
                return Ok(Box::new(stream));
            }
        }
    }
}
