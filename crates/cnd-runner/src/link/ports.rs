//! Runner link interface and effects returned to its runtime owner.

use async_trait::async_trait;
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_commands::RunnerCommand;
use cnd_runner_interface::runner_handshake::RunnerToWorkspace;
use cnd_runner_interface::services::transport::{RunnerServiceCommand, RunnerServiceMessage};

use crate::error::Result;

/// The accepted generation of this link. It is never a service run generation.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ServiceConnection {
    /// Socket generation captured before private asynchronous work.
    pub generation: u64,
}

/// Result of receiving one workspace message.
#[derive(Debug, PartialEq)]
pub enum LinkUpdate {
    /// Welcome was saved and pending events were resent. Reports can start.
    Connected,
    /// An authenticated command received after welcome.
    Command(Box<RunnerCommand>),
    /// Independent authenticated service work for the captured connection.
    ServiceCommand {
        /// Accepted socket generation captured when the command arrived.
        connection: ServiceConnection,
        /// Private command outside the ordinary saved command union.
        command: RunnerServiceCommand,
    },
    /// A confirmation, resend, ignored command, or stale message.
    Progress,
    /// The active socket closed.
    Disconnected,
}

/// Socket lifecycle and saved event delivery, independent of agent work.
#[cfg_attr(test, unimock::unimock(api = RunnerLinkMock))]
#[async_trait]
pub trait RunnerLink: Send + Sync {
    /// Replace any prior connection and send hello before other messages.
    async fn connect(&self) -> Result<()>;
    /// Process one message. A single runtime owner drives this method.
    /// Keep this future until it finishes or the connection ends: receipt precedes processing.
    async fn step(&self) -> Result<LinkUpdate>;
    /// Bound, number, and save an already filtered event before sending it.
    async fn emit(&self, event: RunnerEvent, report_command_id: Option<String>) -> Result<()>;
    /// Save all pending state and replay only committed events.
    async fn persist(&self) -> Result<()>;
    /// Send a file response or a move refusal outside the numbered outbox after welcome.
    async fn reply(&self, response: RunnerToWorkspace) -> Result<()>;
    /// Capture accepted service support. Embeddings without it return None.
    async fn service_connection(&self) -> Option<ServiceConnection> {
        None
    }
    /// Send only to this still-accepted generation, outside the outbox.
    async fn service_reply(
        &self,
        _connection: ServiceConnection,
        _message: RunnerServiceMessage,
    ) -> Result<bool> {
        Ok(false)
    }
    /// Close the socket without discarding saved state.
    async fn close(&self) -> Result<()>;
}
