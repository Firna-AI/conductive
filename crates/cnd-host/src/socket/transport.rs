//! Native socket IO. A failed send wakes the receiver and ends the session.

use std::future::Future;
use std::pin::Pin;

use async_trait::async_trait;
use cnd_runner_interface::host::frames::{self, HostFrame};
use cnd_runner_interface::host::messages::HostToWorker;
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio::sync::{Mutex, watch};
use tokio_tungstenite::tungstenite::protocol::{CloseFrame, Message, frame::coding::CloseCode};
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};

use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::{Incoming, Socket};
use crate::wire::{self, Packet, Reader};

/// Connected stream. Production always constructs the TLS variant.
pub type Stream = WebSocketStream<MaybeTlsStream<TcpStream>>;

/// Native transport exposed through the host socket trait.
pub struct WebSocket {
    sender: Mutex<SplitSink<Stream, Message>>,
    receiver: Mutex<Receiver>,
    failed: watch::Sender<bool>,
}

struct Receiver {
    stream: SplitStream<Stream>,
    reader: Reader,
    failed: watch::Receiver<bool>,
}

impl WebSocket {
    /// Adopt an established socket. The connector enforces TLS before this point.
    pub fn new(stream: Stream) -> Self {
        let (sender, stream) = stream.split();
        let (failed, observed) = watch::channel(false);
        Self {
            sender: Mutex::new(sender),
            receiver: Mutex::new(Receiver {
                stream,
                reader: Reader::default(),
                failed: observed,
            }),
            failed,
        }
    }

    async fn packets(&self, packets: Vec<Packet>) -> Result<()> {
        let mut sender = self.sender.lock().await;
        for packet in packets {
            let frame = match packet {
                Packet::Text(text) => Message::Text(text.into()),
                Packet::Binary(bytes) => Message::Binary(bytes.into()),
            };
            if sender.send(frame).await.is_err() {
                self.failed.send_replace(true);
                return Err(Error::Unavailable);
            }
        }
        Ok(())
    }
}

#[async_trait]
impl Socket for WebSocket {
    async fn send(&self, message: &HostToWorker) -> Result<()> {
        self.packets(wire::encode(message)?).await
    }

    async fn data(&self, stream_id: u32, data: Vec<u8>) -> Result<()> {
        let bytes = frames::encode(&HostFrame::StreamData { stream_id, data }).internal()?;
        self.packets(vec![Packet::Binary(bytes)]).await
    }

    fn receive(&self) -> Pin<Box<dyn Future<Output = Result<Incoming>> + Send + '_>> {
        Box::pin(async move {
            let frame = self.receiver.lock().await.next().await?;
            if matches!(frame, Incoming::Activity)
                && self.sender.lock().await.flush().await.is_err()
            {
                return Err(Error::Unavailable);
            }
            Ok(frame)
        })
    }

    async fn close(&self, code: u16) -> Result<()> {
        self.sender
            .lock()
            .await
            .send(Message::Close(Some(CloseFrame {
                code: CloseCode::from(code),
                reason: "".into(),
            })))
            .await
            .internal()
    }
}

impl Receiver {
    async fn next(&mut self) -> Result<Incoming> {
        if *self.failed.borrow() {
            return Err(Error::Unavailable);
        }
        let frame = tokio::select! {
            _ = self.failed.changed() => return Err(Error::Unavailable),
            frame = self.stream.next() => frame,
        };
        match frame {
            Some(Ok(Message::Text(text))) => self.reader.text(text.as_bytes()),
            Some(Ok(Message::Binary(bytes))) => self.reader.binary(&bytes),
            Some(Ok(Message::Close(close))) => {
                Ok(Incoming::Closed(close.map(|frame| u16::from(frame.code))))
            }
            Some(Ok(_)) => Ok(Incoming::Activity),
            Some(Err(_)) => Err(Error::Unavailable),
            None => Ok(Incoming::Closed(None)),
        }
    }
}
