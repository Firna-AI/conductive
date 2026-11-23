//! Native loopback TCP with independent read and write locks.

use std::net::Ipv4Addr;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::host::literals::HostStreamPort;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpStream;
use tokio::net::tcp::{OwnedReadHalf, OwnedWriteHalf};
use tokio::sync::Mutex;

use crate::error::{Error, ErrorResultExt, Result};

use super::ports::{Connection, LocalSocket, Network};

/// Native fixed-port connector. The stream group owns the ten-second deadline.
pub struct LoopbackNetwork;

impl Network for LoopbackNetwork {
    fn connect(&self, port: HostStreamPort) -> Connection<'_> {
        Box::pin(async move {
            match TcpStream::connect((Ipv4Addr::LOCALHOST, u16::from(port))).await {
                Ok(stream) => {
                    let local: Arc<dyn LocalSocket> = Arc::new(TcpLocal::new(stream));
                    Ok(local)
                }
                Err(_) => Err(Error::Unavailable),
            }
        })
    }
}

/// Local socket adopted after a permitted loopback connection.
pub struct TcpLocal {
    read: Mutex<OwnedReadHalf>,
    write: Mutex<OwnedWriteHalf>,
}

impl TcpLocal {
    /// Split the socket without adding another task or buffer.
    pub fn new(stream: TcpStream) -> Self {
        let (read, write) = stream.into_split();
        Self {
            read: Mutex::new(read),
            write: Mutex::new(write),
        }
    }
}

#[async_trait]
impl LocalSocket for TcpLocal {
    async fn read(&self, maximum: usize) -> Result<Vec<u8>> {
        let mut bytes = vec![0; maximum];
        let count = self.read.lock().await.read(&mut bytes).await.internal()?;
        bytes.truncate(count);
        Ok(bytes)
    }

    async fn write(&self, bytes: &[u8]) -> Result<()> {
        self.write.lock().await.write_all(bytes).await.internal()
    }

    async fn end(&self) -> Result<()> {
        self.write.lock().await.shutdown().await.internal()
    }
}
