//! One host connection with independent ping and inactivity timers.

use std::collections::BTreeSet;
use std::sync::Arc;
use std::time::Duration;

use async_trait::async_trait;
use cnd_runner_interface::host::limits::{HOST_PING_SECONDS, HOST_PROTOCOL_VERSION};
use cnd_runner_interface::host::messages::HostToWorker;
use tokio::sync::watch;
use tokio::task::JoinSet;

use crate::diagnostics::Diagnostics;
use crate::error::Error;
use crate::ports::{Clock, Incoming, Operations, Socket};
use crate::streams::ports::StreamFactory;

use super::ports::{Session, SessionExit};
use super::state::State;

/// Session coordinator, consumed through its trait boundary.
pub struct HostSession {
    /// Commands and files shared across reconnects.
    pub operations: Arc<dyn Operations>,
    /// Fresh stream tables for each connection.
    pub streams: Arc<dyn StreamFactory>,
    /// Ping and inactivity scheduling.
    pub clock: Arc<dyn Clock>,
    /// Credential-free diagnostic events.
    pub diagnostics: Arc<dyn Diagnostics>,
}

#[async_trait]
impl Session for HostSession {
    async fn serve(
        &self,
        socket: Arc<dyn Socket>,
        version: &str,
        mut shutdown: watch::Receiver<bool>,
    ) -> SessionExit {
        let mut state = State {
            socket: socket.clone(),
            operations: self.operations.clone(),
            streams: self.streams.create(socket.clone()),
            tasks: JoinSet::new(),
            writes: JoinSet::new(),
            pending: BTreeSet::new(),
            welcomed: false,
            diagnostics: self.diagnostics.clone(),
        };
        let hello = HostToWorker::Hello {
            host_protocol_version: u32::from(HOST_PROTOCOL_VERSION),
            program_version: version.into(),
        };
        if socket.send(&hello).await.is_err() {
            self.diagnostics.hello_failed();
            state.streams.close_all().await;
            return SessionExit::default();
        }
        let ping = self.clock.wait(Duration::from_secs(HOST_PING_SECONDS));
        let idle = self.clock.wait(Duration::from_secs(60));
        tokio::pin!(ping, idle);
        let mut close_code = None;
        let mut close = None;
        while !*shutdown.borrow() && shutdown.has_changed().is_ok() {
            let result = tokio::select! {
                _ = shutdown.changed() => { close = Some(1000); break; }
                _ = &mut idle => {
                    self.diagnostics.inactive();
                    break;
                },
                _ = &mut ping => {
                    ping.set(self.clock.wait(Duration::from_secs(HOST_PING_SECONDS)));
                    state.queue(HostToWorker::Ping, None);
                    Ok(())
                }
                frame = socket.receive() => {
                    idle.set(self.clock.wait(Duration::from_secs(60)));
                    match frame {
                        Ok(Incoming::Closed(code)) => {
                            self.diagnostics.peer_closed(code);
                            close_code = code;
                            break;
                        }
                        Ok(frame) => tokio::select! {
                            result = state.incoming(frame) => result,
                            _ = &mut idle => break,
                            _ = shutdown.changed() => { close = Some(1000); break; }
                        },
                        Err(error) => Err(error),
                    }
                }
                result = state.tasks.join_next(), if !state.tasks.is_empty() => {
                    match result {
                        Some(result) => state.completed(result).await,
                        None => continue,
                    }
                }
                result = state.writes.join_next(), if !state.writes.is_empty() => match result {
                    Some(result) => state.written(result),
                    None => continue,
                }
            };
            if let Err(error) = result {
                if matches!(error, Error::Protocol) {
                    self.diagnostics.protocol_error();
                    close = Some(1008);
                } else {
                    self.diagnostics.dropped();
                }
                break;
            }
        }
        state.tasks.shutdown().await;
        state.writes.shutdown().await;
        state.streams.close_all().await;
        if let Some(code) = close {
            let _ = socket.close(code).await;
        }
        SessionExit {
            welcomed: state.welcomed,
            close_code,
        }
    }
}

#[cfg(test)]
#[path = "_tests_/host_tests.rs"]
mod tests;
