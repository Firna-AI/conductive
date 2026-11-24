//! Independently owned stream directions with joined cancellation and cleanup.

use std::sync::Arc;
use std::sync::atomic::AtomicUsize;

use async_trait::async_trait;
use tokio::sync::{mpsc, watch};
use tokio::task::JoinSet;

use crate::error::{ErrorResultExt, Result};
use crate::ports::Socket;

use super::ports::LocalSocket;
use super::reader::ReadDirection;
use super::writer::WriteDirection;

pub(super) enum Input {
    Data(Vec<u8>),
    End,
}

#[async_trait]
pub(super) trait Direction: Send {
    async fn run(self: Box<Self>) -> Result<()>;
}

#[async_trait]
pub(super) trait Relay: Send {
    async fn run(self: Box<Self>, cancelled: watch::Receiver<bool>) -> Result<()>;
}

pub(super) struct StreamRelay {
    pub(super) id: u32,
    pub(super) local: Arc<dyn LocalSocket>,
    pub(super) socket: Arc<dyn Socket>,
    pub(super) incoming: mpsc::UnboundedReceiver<Input>,
    pub(super) credits: mpsc::UnboundedReceiver<u32>,
    pub(super) allowance: Arc<AtomicUsize>,
}

#[async_trait]
impl Relay for StreamRelay {
    async fn run(self: Box<Self>, mut cancelled: watch::Receiver<bool>) -> Result<()> {
        let (written, remote_ended) = watch::channel(false);
        let (read, local_ended) = watch::channel(false);
        let reader: Box<dyn Direction> = Box::new(ReadDirection {
            id: self.id,
            local: self.local.clone(),
            socket: self.socket.clone(),
            credits: self.credits,
            remote_ended,
            ended: read,
        });
        let writer: Box<dyn Direction> = Box::new(WriteDirection {
            id: self.id,
            local: self.local,
            socket: self.socket,
            incoming: self.incoming,
            allowance: self.allowance,
            local_ended,
            ended: written,
        });
        let mut tasks = JoinSet::new();
        tasks.spawn(async move { reader.run().await });
        tasks.spawn(async move { writer.run().await });
        let result = loop {
            if *cancelled.borrow() {
                break Ok(());
            }
            let finished = tokio::select! {
                biased;
                _ = cancelled.changed() => break Ok(()),
                finished = tasks.join_next() => finished,
            };
            match finished {
                Some(Ok(Ok(()))) => {}
                Some(Ok(Err(error))) => break Err(error),
                Some(Err(error)) => break Err(error).internal(),
                None => break Ok(()),
            }
        };
        tasks.shutdown().await;
        result
    }
}
