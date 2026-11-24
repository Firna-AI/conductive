//! One bounded queue for all WebSocket application writes.

use std::sync::Arc;

use cnd_runner_interface::computer::limits::COMPUTER_MAX_PENDING_REQUESTS;
use cnd_runner_interface::computer::messages::ComputerToWorker;
use tokio::sync::mpsc;
use tokio::task::JoinSet;

use crate::error::{Error, Result};
use crate::socket::Socket;

type Write = (ComputerToWorker, Option<u32>);

pub(super) struct Writer {
    queue: mpsc::Sender<Write>,
    pub(super) receipts: mpsc::Receiver<Result<Option<u32>>>,
    pub(super) task: JoinSet<()>,
}

impl Writer {
    pub(super) fn new(socket: Arc<dyn Socket>) -> Self {
        let (queue, mut writes) = mpsc::channel::<Write>(COMPUTER_MAX_PENDING_REQUESTS + 2);
        let (completed, receipts) = mpsc::channel(COMPUTER_MAX_PENDING_REQUESTS + 2);
        let mut task = JoinSet::new();
        task.spawn(async move {
            while let Some((message, pending)) = writes.recv().await {
                let result = socket.send(&message).await;
                let sent = result.is_ok();
                if completed.send(result.map(|()| pending)).await.is_err() || !sent {
                    break;
                }
            }
        });
        Self {
            queue,
            receipts,
            task,
        }
    }

    pub(super) fn enqueue(&self, message: ComputerToWorker, pending: Option<u32>) -> Result<()> {
        if self.queue.try_send((message, pending)).is_err() {
            return Err(Error::ConnectionUnavailable);
        }
        Ok(())
    }
}
