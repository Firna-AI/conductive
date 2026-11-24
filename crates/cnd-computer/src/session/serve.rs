//! Establish one session, then run the read, write, and deadline loops.

use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use cnd_runner_interface::computer::limits::{COMPUTER_PING_SECONDS, COMPUTER_PROTOCOL_VERSION};
use cnd_runner_interface::computer::messages::{ComputerToWorker, WorkerToComputer};
use tokio::sync::watch;

use crate::activity::Activity;
use crate::diagnostics::Diagnostics;
use crate::error::Error;
use crate::operations::{Operations, RequestContext};
use crate::socket::{Incoming, Socket};
use crate::timer::{Timer, Wait};

use super::state::State;

const IDLE: Duration = Duration::from_secs(60);
const PING: Duration = Duration::from_secs(COMPUTER_PING_SECONDS);

/// Result of one WebSocket connection, including the code for reconnect policy.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct SessionExit {
    /// A valid welcome reset the retry delay.
    pub welcomed: bool,
    /// Numeric close code sent by the peer, if known.
    pub close_code: Option<u16>,
}

/// One authenticated session up to disconnect or service shutdown.
#[cfg_attr(test, unimock::unimock(api = SessionMock))]
#[async_trait]
pub trait Session: Send + Sync {
    /// Report the version and resources, then accept operations after welcome.
    async fn serve(
        &self,
        socket: Arc<dyn Socket>,
        version: &str,
        context: RequestContext,
        handshake_deadline: Wait,
        shutdown: watch::Receiver<bool>,
    ) -> SessionExit;
}

/// Computer session with independent timing and operation effects.
pub struct ComputerSession {
    /// Requests that must finish before updating the program.
    pub activity: Arc<Activity>,
    /// Fixed operation dispatcher.
    pub operations: Arc<dyn Operations>,
    /// Timers used for the connection and operations.
    pub timer: Arc<dyn Timer>,
    /// Credential-free service diagnostics.
    pub diagnostics: Arc<dyn Diagnostics>,
}

enum End {
    Shutdown,
    Deadline,
    Peer(Option<u16>),
    Failed(Error),
}

#[async_trait]
impl Session for ComputerSession {
    async fn serve(
        &self,
        socket: Arc<dyn Socket>,
        version: &str,
        context: RequestContext,
        handshake_deadline: Wait,
        mut shutdown: watch::Receiver<bool>,
    ) -> SessionExit {
        let hello = ComputerToWorker::Hello {
            computer_protocol_version: u32::from(COMPUTER_PROTOCOL_VERSION),
            program_version: version.to_owned(),
            resources: context.resources.clone(),
        };
        let handshake = if *shutdown.borrow() {
            Err(End::Shutdown)
        } else {
            tokio::select! {
                biased;
                _ = shutdown.changed() => Err(End::Shutdown),
                _ = handshake_deadline => Err(End::Deadline),
                result = self.handshake(&*socket, &hello) => result,
            }
        };
        let end = match handshake {
            Ok(()) => {
                self.diagnostics.welcomed();
                self.activity.welcomed();
                self.serve_ready(socket.clone(), context, &mut shutdown)
                    .await
            }
            Err(end) => return self.finish(&*socket, false, end).await,
        };
        self.finish(&*socket, true, end).await
    }
}

impl ComputerSession {
    async fn handshake(
        &self,
        socket: &dyn Socket,
        hello: &ComputerToWorker,
    ) -> std::result::Result<(), End> {
        if let Err(error) = socket.send(hello).await {
            self.diagnostics.hello_failed();
            return Err(End::Failed(error));
        }
        loop {
            match socket.receive().await {
                Ok(Incoming::Message(WorkerToComputer::Welcome { .. })) => return Ok(()),
                Ok(Incoming::Control) => {}
                Ok(Incoming::Closed(code)) => return Err(End::Peer(code)),
                Ok(_) => return Err(End::Failed(Error::Protocol)),
                Err(error) => return Err(End::Failed(error)),
            }
        }
    }

    async fn serve_ready(
        &self,
        socket: Arc<dyn Socket>,
        context: RequestContext,
        shutdown: &mut watch::Receiver<bool>,
    ) -> End {
        let mut state = State::new(
            socket.clone(),
            context,
            self.operations.clone(),
            self.timer.clone(),
            self.diagnostics.clone(),
            self.activity.clone(),
        );
        let mut ping = self.timer.wait(PING);
        let mut idle = self.timer.wait(IDLE);
        let end = loop {
            let result = tokio::select! {
                _ = shutdown.changed() => break End::Shutdown,
                _ = &mut idle => break End::Deadline,
                _ = &mut ping => {
                    ping = self.timer.wait(PING);
                    state.writer.enqueue(ComputerToWorker::Ping, None)
                }
                received = socket.receive() => {
                    idle = self.timer.wait(IDLE);
                    match received {
                        Ok(Incoming::Closed(code)) => break End::Peer(code),
                        Ok(incoming) => tokio::select! {
                            biased;
                            _ = shutdown.changed() => break End::Shutdown,
                            _ = &mut idle => break End::Deadline,
                            result = state.incoming(incoming) => result,
                        },
                        Err(error) => Err(error),
                    }
                }
                completed = state.tasks.join_next(), if !state.tasks.is_empty() => {
                    match completed {
                        Some(Ok((id, result))) => state.completed(id, result),
                        _ => Err(Error::ConnectionUnavailable),
                    }
                }
                receipt = state.writer.receipts.recv() => state.written(receipt),
            };
            if let Err(error) = result {
                break End::Failed(error);
            }
        };
        state.tasks.shutdown().await;
        state.writer.task.shutdown().await;
        end
    }

    async fn finish(&self, socket: &dyn Socket, welcomed: bool, end: End) -> SessionExit {
        let mut close_code = None;
        let send_close = match end {
            End::Shutdown => Some(1000),
            End::Deadline => {
                self.diagnostics.inactive();
                None
            }
            End::Peer(code) => {
                self.diagnostics.peer_closed(code);
                close_code = code;
                None
            }
            End::Failed(Error::Protocol) => {
                self.diagnostics.protocol_error();
                Some(1008)
            }
            End::Failed(_) => {
                self.diagnostics.dropped();
                None
            }
        };
        if let Some(code) = send_close {
            tokio::select! {
                _ = socket.close(code) => {}
                _ = self.timer.wait(Duration::from_secs(2)) => {}
            }
        }
        SessionExit {
            welcomed,
            close_code,
        }
    }
}

#[cfg(test)]
#[path = "_tests_/serve_tests.rs"]
mod tests;
