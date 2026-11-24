//! Authenticated Rustls upgrades and independent WebSocket send and receive.

use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::computer::limits::{COMPUTER_PATH, COMPUTER_REQUEST_MAX_BYTES};
use cnd_runner_interface::computer::messages::{ComputerToWorker, WorkerToComputer};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{FutureExt, SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio::sync::Mutex;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::{
    Request,
    header::{AUTHORIZATION, HeaderValue},
};
use tokio_tungstenite::tungstenite::protocol::{
    CloseFrame, Message, WebSocketConfig, frame::coding::CloseCode,
};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream, connect_async_with_config, tungstenite};

use crate::error::{Error, Result};
use crate::settings::Settings;
use crate::wire::{self, Reader};

/// One inbound message, message part, or WebSocket control.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Incoming {
    /// Complete application message.
    Message(WorkerToComputer),
    /// An incomplete message part with the request ID.
    Part(u32),
    /// An underlying WebSocket control frame.
    Control,
    /// A peer close, or end of the stream.
    Closed(Option<u16>),
}

/// Cancelable receive of one application or control frame.
pub type Read<'a> = Pin<Box<dyn Future<Output = Result<Incoming>> + Send + 'a>>;

/// One live computer socket.
#[cfg_attr(test, unimock::unimock(api = SocketMock))]
#[async_trait]
pub trait Socket: Send + Sync {
    /// Send an application message, using binary parts when necessary.
    async fn send(&self, message: &ComputerToWorker) -> Result<()>;
    /// Receive one frame and assemble request parts.
    fn receive(&self) -> Read<'_>;
    /// Close the connection with a fixed numeric code.
    async fn close(&self, code: u16) -> Result<()>;
}

/// One pending authenticated WebSocket upgrade.
pub type Connection<'a> = Pin<Box<dyn Future<Output = Result<Arc<dyn Socket>>> + Send + 'a>>;

/// Authenticated outbound connection factory.
#[cfg_attr(test, unimock::unimock(api = ConnectorMock))]
pub trait Connector: Send + Sync {
    /// Open the Worker socket using the saved credential.
    fn connect<'a>(&'a self, settings: &'a Settings) -> Connection<'a>;
}

/// Native TLS connector with WebPKI roots and a sensitive bearer header.
pub struct WebSocketConnector;

impl Connector for WebSocketConnector {
    fn connect<'a>(&'a self, settings: &'a Settings) -> Connection<'a> {
        Box::pin(async move {
            let request = upgrade(settings)?;
            let config = WebSocketConfig::default()
                .max_message_size(Some(COMPUTER_REQUEST_MAX_BYTES))
                .max_frame_size(Some(COMPUTER_REQUEST_MAX_BYTES));
            match connect_async_with_config(request, Some(config), false).await {
                Ok((stream, _)) => {
                    let socket: Arc<dyn Socket> = Arc::new(WireSocket::new(stream));
                    Ok(socket)
                }
                Err(tungstenite::Error::Http(response)) => Err(Error::UpgradeRefused {
                    status: response.status().as_u16(),
                }),
                Err(_) => Err(Error::ConnectionUnavailable),
            }
        })
    }
}

fn upgrade(settings: &Settings) -> Result<Request<()>> {
    let mut url = settings.origin.endpoint(COMPUTER_PATH);
    let scheme = if url.scheme() == "https" { "wss" } else { "ws" };
    if url.set_scheme(scheme).is_err() {
        return Err(Error::InvalidServer);
    }
    let Ok(mut request) = url.as_str().into_client_request() else {
        return Err(Error::InvalidServer);
    };
    let Ok(mut bearer) = HeaderValue::from_str(&format!("Bearer {}", settings.token)) else {
        return Err(Error::InvalidSettings);
    };
    bearer.set_sensitive(true);
    request.headers_mut().insert(AUTHORIZATION, bearer);
    Ok(request)
}

type Stream = WebSocketStream<MaybeTlsStream<TcpStream>>;

struct WireSocket {
    sender: Mutex<SplitSink<Stream, Message>>,
    receiver: Mutex<Receiver>,
}

struct Receiver {
    stream: SplitStream<Stream>,
    reader: Reader,
}

impl WireSocket {
    fn new(stream: Stream) -> Self {
        let (sender, stream) = stream.split();
        Self {
            sender: Mutex::new(sender),
            receiver: Mutex::new(Receiver {
                stream,
                reader: Reader::default(),
            }),
        }
    }
}

#[async_trait]
impl Socket for WireSocket {
    async fn send(&self, message: &ComputerToWorker) -> Result<()> {
        let packets = wire::encode(message)?;
        let mut sender = self.sender.lock().await;
        for packet in packets {
            if sender.send(packet).await.is_err() {
                return Err(Error::ConnectionUnavailable);
            }
        }
        Ok(())
    }

    fn receive(&self) -> Read<'_> {
        Box::pin(async move {
            let mut receiver = self.receiver.lock().await;
            match receiver.stream.next().await {
                Some(Ok(Message::Text(text))) => receiver.reader.text(text.as_bytes()),
                Some(Ok(Message::Binary(bytes))) => receiver.reader.binary(&bytes),
                Some(Ok(Message::Close(frame))) => {
                    self.flush_control();
                    Ok(Incoming::Closed(frame.map(|frame| u16::from(frame.code))))
                }
                Some(Ok(Message::Ping(_))) => {
                    self.flush_control();
                    Ok(Incoming::Control)
                }
                Some(Ok(_)) => Ok(Incoming::Control),
                Some(Err(
                    tungstenite::Error::Protocol(_)
                    | tungstenite::Error::Capacity(_)
                    | tungstenite::Error::Utf8(_),
                )) => Err(Error::Protocol),
                Some(Err(_)) => Err(Error::ConnectionUnavailable),
                None => Ok(Incoming::Closed(None)),
            }
        })
    }

    async fn close(&self, code: u16) -> Result<()> {
        let frame = CloseFrame {
            code: CloseCode::from(code),
            reason: "".into(),
        };
        if self
            .sender
            .lock()
            .await
            .send(Message::Close(Some(frame)))
            .await
            .is_err()
        {
            return Err(Error::ConnectionUnavailable);
        }
        Ok(())
    }
}

impl WireSocket {
    fn flush_control(&self) {
        if let Ok(mut sender) = self.sender.try_lock() {
            let _ = sender.flush().now_or_never();
        }
    }
}

#[cfg(test)]
#[path = "_tests_/socket_tests.rs"]
mod tests;
