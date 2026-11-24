//! Admission, completion, and deadlines for requests on one socket.

use std::collections::BTreeMap;
use std::sync::Arc;
use std::time::Duration;

use cnd_runner_interface::computer::limits::COMPUTER_MAX_PENDING_REQUESTS;
use cnd_runner_interface::computer::messages::{ComputerToWorker, WorkerToComputer};
use cnd_runner_interface::computer::operations::ComputerOperation;
use cnd_runner_interface::computer::results::{ComputerErrorCode, ComputerResult};
use tokio::task::JoinSet;

use crate::activity::{Activity, Request};
use crate::diagnostics::Diagnostics;
use crate::error::{Error, Result};
use crate::operations::{Operations, RequestContext};
use crate::socket::{Incoming, Socket};
use crate::timer::Timer;

use super::writer::Writer;

pub(super) struct State {
    pending: BTreeMap<u32, Request>,
    activity: Arc<Activity>,
    pub(super) tasks: JoinSet<(u32, ComputerResult)>,
    pub(super) writer: Writer,
    operations: Arc<dyn Operations>,
    context: Arc<RequestContext>,
    timer: Arc<dyn Timer>,
    diagnostics: Arc<dyn Diagnostics>,
}

impl State {
    pub(super) fn new(
        socket: Arc<dyn Socket>,
        context: RequestContext,
        operations: Arc<dyn Operations>,
        timer: Arc<dyn Timer>,
        diagnostics: Arc<dyn Diagnostics>,
        activity: Arc<Activity>,
    ) -> Self {
        Self {
            pending: BTreeMap::new(),
            activity,
            tasks: JoinSet::new(),
            writer: Writer::new(socket),
            operations,
            context: Arc::new(context),
            timer,
            diagnostics,
        }
    }

    pub(super) async fn incoming(&mut self, incoming: Incoming) -> Result<()> {
        match incoming {
            Incoming::Message(WorkerToComputer::Request {
                request_id,
                operation,
            }) => self.request(request_id, operation).await,
            Incoming::Message(WorkerToComputer::Pong) | Incoming::Control => Ok(()),
            Incoming::Part(id) if !self.pending.contains_key(&id) => Ok(()),
            _ => Err(Error::Protocol),
        }
    }

    async fn request(&mut self, id: u32, operation: ComputerOperation) -> Result<()> {
        if id == 0 || self.pending.contains_key(&id) {
            return Err(Error::Protocol);
        }
        if self.pending.len() >= COMPUTER_MAX_PENDING_REQUESTS {
            return self.writer.enqueue(
                ComputerToWorker::Reply {
                    request_id: id,
                    result: ComputerResult::Error {
                        code: ComputerErrorCode::Busy,
                    },
                },
                None,
            );
        }
        self.pending.insert(id, self.activity.request().await);
        let operations = self.operations.clone();
        let context = self.context.clone();
        let diagnostics = self.diagnostics.clone();
        let deadline = self.timer.wait(deadline(&operation));
        self.tasks.spawn(async move {
            let result = tokio::select! {
                biased;
                result = operations.execute(operation, context) => result,
                _ = deadline => {
                    diagnostics.request_timed_out();
                    ComputerResult::Error { code: ComputerErrorCode::Internal }
                }
            };
            if let ComputerResult::Error { code } = result {
                diagnostics.operation_failed(code);
            }
            (id, result)
        });
        Ok(())
    }

    pub(super) fn completed(&self, id: u32, result: ComputerResult) -> Result<()> {
        self.writer.enqueue(
            ComputerToWorker::Reply {
                request_id: id,
                result,
            },
            Some(id),
        )
    }

    pub(super) fn written(&mut self, receipt: Option<Result<Option<u32>>>) -> Result<()> {
        if let Some(id) = receipt.ok_or(Error::ConnectionUnavailable)?? {
            self.pending.remove(&id);
        }
        Ok(())
    }
}

fn deadline(operation: &ComputerOperation) -> Duration {
    match operation {
        ComputerOperation::ContainerCreate { .. }
        | ComputerOperation::ImageSave { .. }
        | ComputerOperation::ContainerBootstrap { .. } => Duration::from_secs(14 * 60),
        _ => Duration::from_secs(50),
    }
}

#[cfg(test)]
#[path = "_tests_/state_tests.rs"]
mod tests;
