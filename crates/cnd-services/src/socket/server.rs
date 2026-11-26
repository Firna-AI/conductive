//! A private socket owned by the runner, with independently completed requests.

use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::json::decoder;
use cnd_runner_interface::services::control::ServiceFailure;
use cnd_runner_interface::services::local::{ServiceLocalRequest, ServiceLocalResponse};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{UnixListener, UnixStream};
use tokio::sync::watch;
use tokio::task::JoinSet;

use crate::error::{Error, ErrorResultExt, Result};
use crate::files::private_directory;
use crate::manager::state::ServiceManager;

/// Local request server. Dropping it never stops a service unit.
#[async_trait]
pub trait LocalServer: Send + Sync {
    /// Serve until the runner shuts down. Pending mutations reconcile at restart.
    async fn serve(&self, shutdown: watch::Receiver<bool>) -> Result<()>;
}

/// A single manager serves the user-only socket of this workspace computer.
pub struct UnixServer {
    /// Path in the private runtime root.
    pub path: PathBuf,
    /// Shared serialized registry and effects.
    pub manager: Arc<dyn ServiceManager>,
}

#[async_trait]
impl LocalServer for UnixServer {
    async fn serve(&self, mut shutdown: watch::Receiver<bool>) -> Result<()> {
        let parent = self
            .path
            .parent()
            .ok_or_else(|| Error::internal_message("service socket parent missing"))?;
        private_directory(parent).await?;
        if self.path.try_exists().internal()? {
            if UnixStream::connect(&self.path).await.is_ok() {
                return Err(Error::Unavailable);
            }
            tokio::fs::remove_file(&self.path).await.internal()?;
        }
        let listener = UnixListener::bind(&self.path).internal()?;
        tokio::fs::set_permissions(&self.path, std::fs::Permissions::from_mode(0o600))
            .await
            .internal()?;
        let mut requests = JoinSet::new();
        while !*shutdown.borrow() {
            tokio::select! {
                changed = shutdown.changed() => { if changed.is_err() { break; } }
                accepted = listener.accept() => {
                    let (stream, _) = accepted.internal()?;
                    let manager = self.manager.clone();
                    requests.spawn(async move { let _ = respond(stream, manager).await; });
                }
            }
            while requests.try_join_next().is_some() {}
        }
        requests.abort_all();
        while requests.join_next().await.is_some() {}
        tokio::fs::remove_file(&self.path).await.internal()?;
        Ok(())
    }
}

async fn respond(stream: UnixStream, manager: Arc<dyn ServiceManager>) -> Result<()> {
    let (read, mut write) = stream.into_split();
    let mut line = String::new();
    BufReader::new(read).read_line(&mut line).await.internal()?;
    let request: ServiceLocalRequest = decoder::decode(line.as_bytes()).internal()?;
    let request_id = match &request {
        ServiceLocalRequest::Start { request } => request.request_id.clone(),
        ServiceLocalRequest::List { request_id } => request_id.clone(),
        ServiceLocalRequest::Control { request } => request.request_id.clone(),
        ServiceLocalRequest::Logs { request } => request.request_id.clone(),
    };
    let response = match manager.call(request).await {
        Ok(reply) => reply,
        Err(error) => ServiceLocalResponse::Error {
            request_id,
            error: failure(&error),
        },
    };
    write
        .write_all(&serde_json::to_vec(&response).internal()?)
        .await
        .internal()?;
    write.write_all(b"\n").await.internal()
}

fn failure(error: &Error) -> ServiceFailure {
    let (code, message) = match error {
        Error::CommandRequired => ("command_required", "Choose a command to start."),
        Error::NotFound => (
            "service_not_found",
            "The service was not found. Check the list and try again.",
        ),
        _ => (
            "service_request_failed",
            "The service request failed. Check its state and try again.",
        ),
    };
    ServiceFailure {
        code: code.into(),
        message: message.into(),
    }
}
