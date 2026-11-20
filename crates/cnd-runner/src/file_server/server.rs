//! HTTP/1 serving and cancellation of all file connections on shutdown.

use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use hyper::{server::conn::http1, service::service_fn};
use hyper_util::rt::TokioIo;
use tokio::sync::watch;
use tokio::task::JoinSet;

use super::listener::Listener;
use super::policy::FileRequests;

/// Lifetime of the file server and its accepted connections.
#[async_trait]
pub trait FileServer: Send + Sync {
    /// Serve until shutdown, then close every accepted connection.
    async fn run(&self, shutdown: watch::Receiver<bool>);
}

/// HTTP listener and repository request policy composed by the caller.
pub struct HttpFileServer {
    /// Already bound local listener.
    pub listener: Arc<dyn Listener>,
    /// Request policy over verified repository files.
    pub requests: Arc<dyn FileRequests>,
}

#[async_trait]
impl FileServer for HttpFileServer {
    async fn run(&self, mut shutdown: watch::Receiver<bool>) {
        let mut connections = JoinSet::new();
        while !*shutdown.borrow() && shutdown.has_changed().is_ok() {
            tokio::select! {
                _ = shutdown.changed() => {},
                _ = connections.join_next(), if !connections.is_empty() => {},
                accepted = self.listener.accept() => {
                    let socket = match accepted {
                        Ok(socket) => socket,
                        Err(_) => {
                            tracing::warn!("The file server could not accept a connection.");
                            tokio::select! {
                                _ = shutdown.changed() => {},
                                _ = tokio::time::sleep(Duration::from_millis(100)) => {},
                            }
                            continue;
                        }
                    };
                    let requests = self.requests.clone();
                    connections.spawn(async move {
                        let service = service_fn(move |request: hyper::Request<hyper::body::Incoming>| {
                            let requests = requests.clone();
                            async move {
                                Ok::<_, Infallible>(requests.respond(request.map(|_| ())).await)
                            }
                        });
                        let _ = http1::Builder::new()
                            .serve_connection(TokioIo::new(socket), service)
                            .await;
                    });
                }
            }
        }
        connections.abort_all();
        while connections.join_next().await.is_some() {}
    }
}
