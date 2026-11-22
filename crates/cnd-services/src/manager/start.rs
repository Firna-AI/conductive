//! Exact-name Start and readiness waits that never keep the registry locked.

use cnd_runner_interface::services::local::{
    ServiceLocalResponse, ServiceReadiness, ServiceStartOutcome, ServiceStartRequest,
    ServiceStartResult,
};
use cnd_runner_interface::services::process::{ServiceProcessResult, ServiceState, ServiceStatus};

use crate::error::{Error, Result};
use crate::records::{LaunchRecord, Receipt, SavedService};

use super::state::SavedManager;

impl SavedManager {
    pub(super) async fn start_call(
        &self,
        request: ServiceStartRequest,
    ) -> Result<ServiceLocalResponse> {
        if request.definition.command.is_empty() {
            return Err(Error::CommandRequired);
        }
        let (mut result, mut observed) = {
            let mut slot = self.state.lock().await;
            let state = self.loaded(&mut slot).await?;
            self.refresh(state).await?;
            if let Some(mut receipt) = state.receipts.get(&request.request_id).cloned() {
                if let Receipt::Start { result, .. } = &mut receipt
                    && let Some(service) = state
                        .services
                        .get(&result.service.target.identity.service_id)
                        .filter(|service| {
                            service.generation == result.service.target.identity.generation
                        })
                {
                    result.service = self.entry(&state.boot_id, service);
                }
                state
                    .receipts
                    .insert(request.request_id.clone(), receipt.clone());
                self.save(state).await?;
                return Ok(Self::receipt_reply(&receipt));
            }
            let existing = state
                .services
                .values()
                .find(|service| service.name == request.name)
                .cloned();
            let running = existing
                .as_ref()
                .is_some_and(|value| value.status.state == ServiceState::Running);
            let service = if running {
                existing.ok_or(Error::NotFound)?
            } else {
                let service_id = existing
                    .map(|value| value.service_id)
                    .unwrap_or_else(|| self.effects.runtime.identity());
                let generation = self.effects.runtime.identity();
                SavedService {
                    unit: format!("conductive-project-{service_id}-{generation}.service"),
                    service_id,
                    generation,
                    name: request.name,
                    definition: request.definition,
                    originating_turn_id: request.originating_turn_id,
                    status: ServiceStatus {
                        state: ServiceState::Running,
                        started_at: self.effects.runtime.now(),
                        ended_at: None,
                        result: None,
                    },
                    ports: vec![],
                    stopping: false,
                }
            };
            let mut result = ServiceStartResult {
                service: self.entry(&state.boot_id, &service),
                outcome: if running {
                    ServiceStartOutcome::AlreadyRunning
                } else {
                    ServiceStartOutcome::Started
                },
                readiness: ServiceReadiness::NotRequested,
            };
            state
                .services
                .insert(service.service_id.clone(), service.clone());
            state.receipts.insert(
                request.request_id.clone(),
                Receipt::Start {
                    request_id: request.request_id.clone(),
                    result: result.clone(),
                },
            );
            self.save(state).await?;
            let mut service = service;
            if !running {
                let _launched = self.launch(&mut service).await?;
                self.observe(&mut service).await?;
                state
                    .services
                    .insert(service.service_id.clone(), service.clone());
                result.service = self.entry(&state.boot_id, &service);
                state.receipts.insert(
                    request.request_id.clone(),
                    Receipt::Start {
                        request_id: request.request_id.clone(),
                        result: result.clone(),
                    },
                );
                self.save(state).await?;
            }
            (result, service)
        };
        if let Some(wait) = request.wait_for_port {
            self.wait_for_port(&mut result, &mut observed, wait).await?;
            let mut slot = self.state.lock().await;
            let state = self.loaded(&mut slot).await?;
            state.receipts.insert(
                request.request_id.clone(),
                Receipt::Start {
                    request_id: request.request_id.clone(),
                    result: result.clone(),
                },
            );
            self.save(state).await?;
        }
        Ok(ServiceLocalResponse::Start {
            request_id: request.request_id,
            result,
        })
    }

    pub(super) async fn launch(&self, service: &mut SavedService) -> Result<bool> {
        let mut environment = self.effects.environment.read().await?;
        environment.insert("PWD".into(), service.definition.folder.clone());
        environment.extend(service.definition.env.clone());
        let path = self
            .effects
            .store
            .prepare(LaunchRecord {
                service_id: service.service_id.clone(),
                generation: service.generation.clone(),
                unit: service.unit.clone(),
                definition: service.definition.clone(),
                environment,
            })
            .await?;
        if self
            .effects
            .units
            .launch(&service.unit, path)
            .await
            .is_err()
        {
            service.status.state = ServiceState::Failed;
            service.status.ended_at = Some(self.effects.runtime.now());
            service.status.result = Some(ServiceProcessResult::StartFailed);
            return Ok(false);
        }
        Ok(true)
    }
}
