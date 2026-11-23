//! One stream's credit-controlled local reads and queued writes.

use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

use async_trait::async_trait;
use cnd_runner_interface::host::limits::{HOST_STREAM_FRAME_BYTES, HOST_STREAM_WINDOW_BYTES};
use cnd_runner_interface::host::messages::HostToWorker;
use tokio::sync::mpsc;

use crate::error::{Error, Result};
use crate::ports::Socket;

use super::ports::LocalSocket;

pub(super) enum Input {
    Data(Vec<u8>),
    Credit(u32),
    End,
}

#[async_trait]
pub(super) trait Relay: Send {
    async fn run(&mut self) -> Result<()>;
}

pub(super) struct StreamRelay {
    pub(super) id: u32,
    pub(super) local: Arc<dyn LocalSocket>,
    pub(super) socket: Arc<dyn Socket>,
    pub(super) incoming: mpsc::UnboundedReceiver<Input>,
    pub(super) allowance: Arc<AtomicUsize>,
}

#[async_trait]
impl Relay for StreamRelay {
    async fn run(&mut self) -> Result<()> {
        let mut credit = HOST_STREAM_WINDOW_BYTES;
        let (mut local_ended, mut remote_ended) = (false, false);
        while !local_ended || !remote_ended {
            tokio::select! {
                input = self.incoming.recv() => match input {
                    Some(Input::Data(bytes)) if !remote_ended => {
                        self.local.write(&bytes).await?;
                        self.allowance.fetch_add(bytes.len(), Ordering::SeqCst);
                        self.socket.send(&HostToWorker::StreamCredit { stream_id: self.id, bytes: bytes.len() as u32 }).await?;
                    }
                    Some(Input::Credit(bytes)) => {
                        credit = credit.checked_add(bytes as usize).ok_or(Error::Protocol)?;
                        if credit > HOST_STREAM_WINDOW_BYTES { return Err(Error::Protocol); }
                    }
                    Some(Input::End) if !remote_ended => {
                        self.local.end().await?;
                        remote_ended = true;
                    }
                    None => break,
                    _ => return Err(Error::Protocol),
                },
                read = self.local.read(credit.min(HOST_STREAM_FRAME_BYTES)), if credit != 0 && !local_ended => {
                    let bytes = read?;
                    if bytes.is_empty() {
                        local_ended = true;
                        self.socket.send(&HostToWorker::StreamEnd { stream_id: self.id }).await?;
                    } else {
                        credit = credit.checked_sub(bytes.len()).ok_or(Error::Protocol)?;
                        self.socket.data(self.id, bytes).await?;
                    }
                }
            }
        }
        Ok(())
    }
}
