//! One local request per Unix connection, with no implicit retry.

use std::path::PathBuf;

use async_trait::async_trait;
use cnd_runner_interface::json::decoder;
use cnd_runner_interface::services::local::{ServiceLocalRequest, ServiceLocalResponse};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::UnixStream;

use crate::error::{Error, ErrorResultExt, Result};

/// Local request transport. Calls require neither a turn nor a workspace token.
#[unimock::unimock(api = LocalClientMock)]
#[async_trait]
pub trait LocalClient: Send + Sync {
    /// Send once and wait for the correlated reply. Never retry a lost control.
    async fn call(&self, request: ServiceLocalRequest) -> Result<ServiceLocalResponse>;
}

/// Native transport selected by the runner's private runtime directory.
pub struct UnixClient {
    /// Workspace-local socket path, normally /run/conductive/services/control.sock.
    pub path: PathBuf,
}

#[async_trait]
impl LocalClient for UnixClient {
    async fn call(&self, request: ServiceLocalRequest) -> Result<ServiceLocalResponse> {
        let mut stream = match UnixStream::connect(&self.path).await {
            Ok(stream) => stream,
            Err(_) => return Err(Error::Unavailable),
        };
        stream
            .write_all(&serde_json::to_vec(&request).internal()?)
            .await
            .internal()?;
        stream.write_all(b"\n").await.internal()?;
        let mut line = String::new();
        BufReader::new(stream)
            .read_line(&mut line)
            .await
            .internal()?;
        decoder::decode(line.as_bytes()).internal()
    }
}
