//! Sensitive bearer authentication over Rustls with public WebPKI roots.

use std::sync::Arc;

use cnd_runner_interface::host::limits::HOST_PATH;
use tokio_tungstenite::tungstenite;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::{
    Request,
    header::{AUTHORIZATION, HeaderValue},
};
use url::Url;

use crate::config::ConnectionRequest;
use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::{Connector, Socket, SocketConnection};

use super::transport::WebSocket;

/// Native TLS connector. An upgrade refusal contains no saved request in its error.
pub struct WebSocketConnector;

/// Construct the authenticated upgrade without opening a network connection.
pub fn upgrade(request: &ConnectionRequest) -> Result<Request<()>> {
    let mut url = Url::parse(&request.origin).internal()?;
    if !matches!(url.scheme(), "https" | "wss") {
        return Err(Error::TlsRequired);
    }
    if url.scheme() == "https" && url.set_scheme("wss").is_err() {
        return Err(Error::TlsRequired);
    }
    url.set_path(HOST_PATH);
    url.set_query(None);
    url.set_fragment(None);
    let mut upgrade = url.as_str().into_client_request().internal()?;
    let mut bearer = HeaderValue::from_str(&format!("Bearer {}", request.token)).internal()?;
    bearer.set_sensitive(true);
    upgrade.headers_mut().insert(AUTHORIZATION, bearer);
    Ok(upgrade)
}

impl Connector for WebSocketConnector {
    fn connect<'a>(&'a self, request: &'a ConnectionRequest) -> SocketConnection<'a> {
        Box::pin(async move {
            match tokio_tungstenite::connect_async(upgrade(request)?).await {
                Ok((socket, _)) => {
                    let socket: Arc<dyn Socket> = Arc::new(WebSocket::new(socket));
                    Ok(socket)
                }
                Err(tungstenite::Error::Http(response)) => Err(Error::UpgradeRefused {
                    status: response.status().as_u16(),
                }),
                Err(_) => Err(Error::Unavailable),
            }
        })
    }
}

#[cfg(test)]
#[path = "_tests_/connect_tests.rs"]
mod tests;
