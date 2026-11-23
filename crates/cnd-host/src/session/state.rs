//! Per-connection operation tasks and typed stream controls.

use std::collections::BTreeSet;
use std::sync::Arc;
use std::time::Duration;

use cnd_runner_interface::host::limits::{HOST_MAX_PENDING_REQUESTS, HOST_REPLY_MAX_BYTES};
use cnd_runner_interface::host::messages::{HostToWorker, WorkerToHost};
use cnd_runner_interface::host::operations::HostOperation;
use cnd_runner_interface::host::results::{HostErrorCode, HostResult};
use tokio::task::{JoinError, JoinSet};

use crate::diagnostics::Diagnostics;
use crate::error::{Error, ErrorResultExt, Result};
use crate::ports::{Clock, Incoming, Operations, Socket};
use crate::replies;
use crate::streams::ports::Streams;

pub(super) struct State {
    pub(super) socket: Arc<dyn Socket>,
    pub(super) operations: Arc<dyn Operations>,
    pub(super) streams: Arc<dyn Streams>,
    pub(super) tasks: JoinSet<(u32, usize, Result<HostResult>)>,
    pub(super) writes: JoinSet<(Option<u32>, Result<()>)>,
    pub(super) pending: BTreeSet<u32>,
    pub(super) welcomed: bool,
    pub(super) diagnostics: Arc<dyn Diagnostics>,
    pub(super) clock: Arc<dyn Clock>,
}

impl State {
    pub(super) async fn incoming(&mut self, frame: Incoming) -> Result<()> {
        match frame {
            Incoming::Activity => return Ok(()),
            Incoming::Message(WorkerToHost::Welcome { .. }) if !self.welcomed => {
                self.welcomed = true;
                self.diagnostics.welcomed();
                return Ok(());
            }
            _ if !self.welcomed => return Err(Error::Protocol),
            Incoming::Data { stream_id, data } => return self.streams.data(stream_id, data).await,
            Incoming::Message(message) => match message {
                WorkerToHost::Pong => return Ok(()),
                WorkerToHost::StreamEnd { stream_id } => return self.streams.end(stream_id).await,
                WorkerToHost::StreamClose { stream_id } => {
                    self.streams.close(stream_id).await;
                    return Ok(());
                }
                WorkerToHost::StreamCredit { stream_id, bytes } => {
                    return self.streams.credit(stream_id, bytes).await;
                }
                WorkerToHost::Request {
                    request_id,
                    operation,
                } => return self.request(request_id, operation).await,
                _ => {}
            },
            _ => {}
        }
        Err(Error::Protocol)
    }

    async fn request(&mut self, request_id: u32, operation: HostOperation) -> Result<()> {
        if self.pending.contains(&request_id) {
            return Err(Error::Protocol);
        }
        if self.pending.len() >= HOST_MAX_PENDING_REQUESTS {
            let reply = replies::bounded(
                request_id,
                HostResult::Error {
                    code: HostErrorCode::Busy,
                },
                HOST_REPLY_MAX_BYTES,
            )?;
            self.queue(reply, None);
            return Ok(());
        }
        self.pending.insert(request_id);
        let operations = self.operations.clone();
        let streams = self.streams.clone();
        let clock = self.clock.clone();
        self.tasks.spawn(async move {
            let maximum = replies::budget(&operation);
            let result = match operation {
                HostOperation::StreamOpen { stream_id, port } => {
                    streams.open(stream_id, port).await
                }
                operation @ HostOperation::CommandRun { .. } => operations.execute(operation).await,
                operation => tokio::select! {
                    biased;
                    result = operations.execute(operation) => result,
                    _ = clock.wait(Duration::from_secs(30)) => Ok(HostResult::Error { code: HostErrorCode::Internal }),
                },
            };
            (request_id, maximum, result)
        });
        Ok(())
    }

    pub(super) async fn completed(
        &mut self,
        result: std::result::Result<(u32, usize, Result<HostResult>), JoinError>,
    ) -> Result<()> {
        let (request_id, maximum, result) = result.internal()?;
        let result = result.unwrap_or(HostResult::Error {
            code: HostErrorCode::Internal,
        });
        let reply = replies::bounded(request_id, result, maximum)?;
        self.queue(reply, Some(request_id));
        Ok(())
    }

    pub(super) fn queue(&mut self, reply: HostToWorker, pending: Option<u32>) {
        let socket = self.socket.clone();
        let streams = self.streams.clone();
        self.writes.spawn(async move {
            let result = socket.send(&reply).await;
            if result.is_ok()
                && let HostToWorker::Reply {
                    result: HostResult::StreamOpened { stream_id },
                    ..
                } = reply
            {
                streams.activate(stream_id).await;
            }
            (pending, result)
        });
    }

    pub(super) fn written(
        &mut self,
        result: std::result::Result<(Option<u32>, Result<()>), JoinError>,
    ) -> Result<()> {
        let (pending, result) = result.internal()?;
        if let Some(request_id) = pending {
            self.pending.remove(&request_id);
        }
        result
    }
}

#[cfg(test)]
#[path = "_tests_/state_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "_tests_/deadline_tests.rs"]
mod deadline_tests;
