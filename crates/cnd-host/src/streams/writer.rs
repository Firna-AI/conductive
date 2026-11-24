//! Peer-to-local writes return credit only after handoff and retain input order.

use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};

use async_trait::async_trait;
use cnd_runner_interface::host::messages::HostToWorker;
use tokio::sync::{mpsc, watch};

use crate::error::{Error, Result};
use crate::ports::Socket;

use super::ports::LocalSocket;
use super::relay::{Direction, Input};

pub(super) struct WriteDirection {
    pub(super) id: u32,
    pub(super) local: Arc<dyn LocalSocket>,
    pub(super) socket: Arc<dyn Socket>,
    pub(super) incoming: mpsc::UnboundedReceiver<Input>,
    pub(super) allowance: Arc<AtomicUsize>,
    pub(super) local_ended: watch::Receiver<bool>,
    pub(super) ended: watch::Sender<bool>,
}

#[async_trait]
impl Direction for WriteDirection {
    async fn run(mut self: Box<Self>) -> Result<()> {
        let mut ended = false;
        while !ended || !*self.local_ended.borrow() {
            let input = tokio::select! {
                changed = self.local_ended.changed(), if !*self.local_ended.borrow() => {
                    if changed.is_err() { return Err(Error::Unavailable); }
                    continue;
                },
                input = self.incoming.recv() => input,
            };
            match input {
                Some(Input::Data(bytes)) if !ended => {
                    self.local.write(&bytes).await?;
                    self.allowance.fetch_add(bytes.len(), Ordering::SeqCst);
                    self.socket
                        .send(&HostToWorker::StreamCredit {
                            stream_id: self.id,
                            bytes: bytes.len() as u32,
                        })
                        .await?;
                }
                Some(Input::End) if !ended => {
                    self.local.end().await?;
                    ended = true;
                    self.ended.send_replace(true);
                }
                None => break,
                _ => return Err(Error::Protocol),
            }
        }
        Ok(())
    }
}
