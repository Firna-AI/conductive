//! Public local calls and complete selected snapshots, with no Worker transport.

use std::path::{Path, PathBuf};

use async_trait::async_trait;
use cnd_runner::ports::metadata::{port_folder, port_name};
use cnd_runner_interface::services::local::{ServiceLocalRequest, ServiceLocalResponse};
use cnd_runner_interface::services::process::{ServiceIdentity, ServiceSummary};
use cnd_runner_interface::services::reports::{ServiceReport, ServiceReportEntry};

use crate::error::{Error, Result};
use crate::records::Registry;

use super::state::{SavedManager, ServiceManager};

#[async_trait]
impl ServiceManager for SavedManager {
    async fn repository(&self, root: PathBuf) -> Result<()> {
        let mut slot = self.state.lock().await;
        let state = self.loaded(&mut slot).await?;
        if state.repository != root {
            state.repository = root;
            self.save(state).await?;
        }
        Ok(())
    }
    async fn reconcile(&self) -> Result<()> {
        let mut slot = self.state.lock().await;
        let state = self.loaded(&mut slot).await?;
        self.refresh(state).await
    }

    async fn call(&self, request: ServiceLocalRequest) -> Result<ServiceLocalResponse> {
        if let ServiceLocalRequest::Start { request } = request {
            return self.start_call(request).await;
        }
        if let ServiceLocalRequest::Logs { request } = request {
            return self.read_logs(request).await;
        }
        let mut slot = self.state.lock().await;
        let state = self.loaded(&mut slot).await?;
        self.refresh(state).await?;
        match request {
            ServiceLocalRequest::List { request_id } => {
                let mut services: Vec<_> = state
                    .services
                    .values()
                    .map(|value| self.entry(&state.boot_id, value))
                    .collect();
                services.sort_by(|left, right| left.name.cmp(&right.name));
                Ok(ServiceLocalResponse::List {
                    request_id,
                    boot_id: state.boot_id.clone(),
                    services,
                })
            }
            ServiceLocalRequest::Control { request } => self.control(state, request).await,
            ServiceLocalRequest::Start { .. } | ServiceLocalRequest::Logs { .. } => Err(
                Error::internal_message("request bypassed its local dispatcher"),
            ),
        }
    }

    async fn snapshot(&self) -> Result<ServiceReport> {
        let mut slot = self.state.lock().await;
        let state = self.loaded(&mut slot).await?;
        self.refresh(state).await?;
        Ok(self.report(state))
    }

    async fn fresh_snapshot(&self) -> Result<ServiceReport> {
        let mut slot = self.state.lock().await;
        let state = self.loaded(&mut slot).await?;
        self.refresh(state).await?;
        self.save(state).await?;
        Ok(self.report(state))
    }

    async fn try_snapshot(&self) -> Result<Option<ServiceReport>> {
        let Ok(mut slot) = self.state.try_lock() else {
            return Ok(None);
        };
        let state = self.loaded(&mut slot).await?;
        self.refresh(state).await?;
        Ok(Some(self.report(state)))
    }
}

impl SavedManager {
    fn report(&self, state: &Registry) -> ServiceReport {
        let repository = &state.repository;
        let services = state
            .services
            .values()
            .map(|value| {
                let first = value
                    .definition
                    .command
                    .first()
                    .map(String::as_str)
                    .unwrap_or_default();
                let executable = format!(
                    "/{}",
                    Path::new(first)
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                );
                ServiceReportEntry {
                    service: ServiceSummary {
                        identity: ServiceIdentity {
                            service_id: value.service_id.clone(),
                            generation: value.generation.clone(),
                        },
                        name: value.name.clone(),
                        program: port_name(&value.definition.command.join("\0"), &executable),
                        folder: port_folder(
                            &value.definition.folder,
                            &self.effects.home,
                            repository,
                        ),
                        status: value.status.clone(),
                        ports: value.ports.clone(),
                    },
                    originating_turn_id: value.originating_turn_id.clone(),
                }
            })
            .collect();
        ServiceReport {
            boot_id: state.boot_id.clone(),
            revision: state.revision,
            services,
        }
    }
}
