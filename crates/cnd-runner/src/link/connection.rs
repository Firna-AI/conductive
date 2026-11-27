//! Stateful runner link consumed through RunnerLink.

use std::path::Path;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::runner_credentials::{LoginKind, RunnerLoginKind};
use cnd_runner_interface::runner_handshake::{
    RunnerEventEnvelope, RunnerHello, RunnerProtocolVersion, RunnerToWorkspace,
};
use cnd_runner_interface::services::transport::RunnerServiceMessage;
use tokio::sync::Mutex;

use crate::clock::Clock;
use crate::config::ConnectionRequest;
use crate::error::Result;
use crate::socket::{Connector, Socket};
use crate::state::store::EventStore;

use super::ports::{LinkUpdate, RunnerLink, ServiceConnection};
use super::tool_detail::prepare;

pub(super) struct Connection {
    pub(super) generation: u64,
    pub(super) socket: Option<Arc<dyn Socket>>,
    pub(super) welcomed: bool,
    pub(super) complete_tool_details: bool,
    pub(super) changes_delta_generation: Option<u64>,
    pub(super) services: bool,
}

/// Configured transport and state dependencies. Tokens stay in memory only.
pub struct SavedRunnerLink {
    pub(super) workspace_id: String,
    process_start_id: String,
    file_server: bool,
    pub(super) request: ConnectionRequest,
    pub(super) connector: Arc<dyn Connector>,
    pub(super) clock: Arc<dyn Clock>,
    pub(super) store: Arc<dyn EventStore>,
    pub(super) connection: Mutex<Connection>,
    connecting: Mutex<()>,
    pub(super) messages: Mutex<()>,
    emitting: Mutex<()>,
    repository_folder: Option<String>,
    pub(super) services_offered: bool,
}

impl SavedRunnerLink {
    /// Compose the link without performing IO. The store must already be loaded.
    pub fn new(
        workspace_id: String,
        process_start_id: String,
        request: ConnectionRequest,
        connector: Arc<dyn Connector>,
        clock: Arc<dyn Clock>,
        store: Arc<dyn EventStore>,
        file_server: bool,
    ) -> Self {
        Self {
            workspace_id,
            process_start_id,
            file_server,
            request,
            connector,
            clock,
            store,
            connection: Mutex::new(Connection {
                generation: 0,
                socket: None,
                welcomed: false,
                complete_tool_details: false,
                changes_delta_generation: None,
                services: false,
            }),
            connecting: Mutex::new(()),
            messages: Mutex::new(()),
            emitting: Mutex::new(()),
            repository_folder: None,
            services_offered: false,
        }
    }

    /// Name the repository folder in hello. The Worker then may send repository.move.
    pub fn with_repository_folder(mut self, folder: &Path) -> Self {
        self.repository_folder = Some(folder.to_string_lossy().into_owned());
        self
    }

    /// Offer private services only when the composition also supplies their effects.
    pub fn with_services(mut self) -> Self {
        self.services_offered = true;
        self
    }

    pub(super) async fn disconnect(&self, generation: u64) {
        let socket = {
            let mut active = self.connection.lock().await;
            if active.generation != generation {
                return;
            }
            active.generation += 1;
            active.welcomed = false;
            active.services = false;
            active.socket.take()
        };
        if let Some(socket) = socket {
            let _ = socket.close().await;
        }
    }

    pub(super) async fn send(&self, message: RunnerToWorkspace) {
        if matches!(message, RunnerToWorkspace::RunnerServiceMessage(_)) {
            return;
        }
        let current = {
            let active = self.connection.lock().await;
            if !active.welcomed {
                return;
            }
            active
                .socket
                .as_ref()
                .map(|socket| (active.generation, socket.clone()))
        };
        if let Some((generation, socket)) = current
            && socket.send(&message).await.is_err()
        {
            self.disconnect(generation).await;
        }
    }

    pub(super) async fn resend(&self, from: u64) {
        for envelope in self.store.snapshot().await.outbox {
            let RunnerEventEnvelope::Event { event_number, .. } = &envelope;
            if *event_number >= from {
                self.send(RunnerToWorkspace::RunnerEventEnvelope(envelope))
                    .await;
            }
        }
    }
}

#[async_trait]
impl RunnerLink for SavedRunnerLink {
    async fn connect(&self) -> Result<()> {
        let _connecting = self.connecting.lock().await;
        self.close().await?;
        let generation = self.connection.lock().await.generation;
        let socket = self.connector.connect(&self.request).await?;
        {
            let mut active = self.connection.lock().await;
            if active.generation != generation {
                return socket.close().await;
            }
            active.socket = Some(socket.clone());
        }
        let hello = RunnerHello::Hello {
            protocol_version: RunnerProtocolVersion,
            workspace_id: self.workspace_id.clone(),
            stream_id: self.store.snapshot().await.stream_id,
            process_start_id: Some(self.process_start_id.clone()),
            file_server: self.file_server.then_some(true),
            skill_reads: Some(true),
            login_kinds: Some(vec![
                RunnerLoginKind::Claude {
                    kind: LoginKind::Token,
                },
                RunnerLoginKind::Claude {
                    kind: LoginKind::ApiKey,
                },
                RunnerLoginKind::Codex {
                    kind: LoginKind::Token,
                },
                RunnerLoginKind::Codex {
                    kind: LoginKind::ApiKey,
                },
            ]),
            repository_folder: self.repository_folder.clone(),
            complete_tool_details: Some(true),
            capability_notices: Some(true),
            services: self.services_offered.then_some(true),
            changes_deltas: Some(true),
        };
        if let Err(error) = socket.send(&RunnerToWorkspace::RunnerHello(hello)).await {
            self.disconnect(generation).await;
            return Err(error);
        }
        Ok(())
    }

    async fn step(&self) -> Result<LinkUpdate> {
        self.next_message().await
    }

    async fn changes_delta_generation(&self) -> Option<u64> {
        self.connection.lock().await.changes_delta_generation
    }

    async fn emit(&self, event: RunnerEvent, report_command_id: Option<String>) -> Result<()> {
        let _emitting = self.emitting.lock().await;
        let complete = self.connection.lock().await.complete_tool_details;
        let now = self.clock.now()?;
        let events = prepare(event, complete, &self.store.snapshot().await.stream_id, now)?;
        match self
            .store
            .append_batch(events, now, report_command_id)
            .await?
        {
            Some(envelopes) => {
                for envelope in envelopes {
                    self.send(RunnerToWorkspace::RunnerEventEnvelope(envelope))
                        .await;
                }
            }
            None => tracing::warn!("The runner event exceeds its byte limit."),
        }
        Ok(())
    }

    async fn persist(&self) -> Result<()> {
        self.store.persist().await?;
        self.resend(self.store.snapshot().await.confirmed_through + 1)
            .await;
        Ok(())
    }

    async fn reply(&self, response: RunnerToWorkspace) -> Result<()> {
        self.send(response).await;
        Ok(())
    }

    async fn service_connection(&self) -> Option<ServiceConnection> {
        self.accepted_services().await
    }

    async fn service_reply(
        &self,
        connection: ServiceConnection,
        message: RunnerServiceMessage,
    ) -> Result<bool> {
        self.send_service(connection, message).await
    }

    async fn close(&self) -> Result<()> {
        let generation = self.connection.lock().await.generation;
        self.disconnect(generation).await;
        Ok(())
    }
}
