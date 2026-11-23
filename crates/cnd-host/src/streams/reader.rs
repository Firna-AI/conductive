//! Local-to-peer bytes and their independent credit window and half close.

use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::host::limits::{HOST_STREAM_FRAME_BYTES, HOST_STREAM_WINDOW_BYTES};
use cnd_runner_interface::host::messages::HostToWorker;
use tokio::sync::{mpsc, watch};

use crate::error::{Error, Result};
use crate::ports::Socket;

use super::ports::LocalSocket;
use super::relay::Direction;

pub(super) struct ReadDirection {
    pub(super) id: u32,
    pub(super) local: Arc<dyn LocalSocket>,
    pub(super) socket: Arc<dyn Socket>,
    pub(super) credits: mpsc::UnboundedReceiver<u32>,
    pub(super) remote_ended: watch::Receiver<bool>,
    pub(super) ended: watch::Sender<bool>,
}

#[async_trait]
impl Direction for ReadDirection {
    async fn run(mut self: Box<Self>) -> Result<()> {
        let mut credit = HOST_STREAM_WINDOW_BYTES;
        let mut ended = false;
        while !ended || !*self.remote_ended.borrow() {
            tokio::select! {
                bytes = self.credits.recv() => {
                    let bytes = bytes.ok_or(Error::Unavailable)?;
                    credit = credit.checked_add(bytes as usize).ok_or(Error::Protocol)?;
                    if credit > HOST_STREAM_WINDOW_BYTES { return Err(Error::Protocol); }
                },
                changed = self.remote_ended.changed(), if !*self.remote_ended.borrow() => {
                    if changed.is_err() { return Err(Error::Unavailable); }
                },
                bytes = self.local.read(credit.min(HOST_STREAM_FRAME_BYTES)), if credit != 0 && !ended => {
                    let bytes = bytes?;
                    if bytes.is_empty() {
                        ended = true;
                        self.socket.send(&HostToWorker::StreamEnd { stream_id: self.id }).await?;
                        self.ended.send_replace(true);
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
