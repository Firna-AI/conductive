//! Durable control receipts and save-before-effect Stop and Restart transitions.

use cnd_runner_interface::services::control::{
    ServiceControlAction, ServiceControlOutcome, ServiceControlRequest, ServiceControlResult,
    ServiceFailure,
};
use cnd_runner_interface::services::local::ServiceLocalResponse;
use cnd_runner_interface::services::process::{ServiceState, ServiceStatus};

use crate::error::Result;
use crate::records::{Receipt, Registry};

use super::state::SavedManager;

impl SavedManager {
    pub(super) fn receipt_reply(receipt: &Receipt) -> ServiceLocalResponse {
        match receipt {
            Receipt::Start { request_id, result } => ServiceLocalResponse::Start {
                request_id: request_id.clone(),
                result: result.clone(),
            },
            Receipt::Control { result } => ServiceLocalResponse::Control {
                result: result.clone(),
            },
        }
    }

    pub(super) async fn control(
        &self,
        state: &mut Registry,
        request: ServiceControlRequest,
    ) -> Result<ServiceLocalResponse> {
        if let Some(receipt) = state.receipts.get(&request.request_id) {
            return Ok(Self::receipt_reply(receipt));
        }
        let mut result = ServiceControlResult {
            request: request.clone(),
            outcome: ServiceControlOutcome::Stale,
        };
        let selected = state
            .services
            .get(&request.target.identity.service_id)
            .filter(|service| {
                request.target.boot_id == state.boot_id
                    && request.target.identity.generation == service.generation
            })
            .cloned();
        if let Some(mut service) = selected {
            if request.action == ServiceControlAction::Stop
                && service.status.state != ServiceState::Running
            {
                result.outcome = ServiceControlOutcome::Unchanged;
            } else {
                result.outcome = ServiceControlOutcome::Unconfirmed;
                state.receipts.insert(
                    request.request_id.clone(),
                    Receipt::Control {
                        result: result.clone(),
                    },
                );
                service.stopping = service.status.state == ServiceState::Running;
                state
                    .services
                    .insert(service.service_id.clone(), service.clone());
                self.save(state).await?;
                let stopped = if service.stopping {
                    self.effects.units.stop(&service.unit).await
                } else {
                    Ok(())
                };
                if stopped.is_err() {
                    service.stopping = false;
                    result.outcome = ServiceControlOutcome::Failed {
                        error: ServiceFailure {
                            code: "service_control_failed".into(),
                            message: "The service could not stop. Check its state and try again."
                                .into(),
                        },
                    };
                } else {
                    self.observe(&mut service).await?;
                    let mut launched = true;
                    if request.action == ServiceControlAction::Restart {
                        service.generation = self.effects.runtime.identity();
                        service.unit = format!(
                            "conductive-project-{}-{}.service",
                            service.service_id, service.generation
                        );
                        service.status = ServiceStatus {
                            state: ServiceState::Running,
                            started_at: self.effects.runtime.now(),
                            ended_at: None,
                            result: None,
                        };
                        service.ports.clear();
                        state
                            .services
                            .insert(service.service_id.clone(), service.clone());
                        self.save(state).await?;
                        launched = self.launch(&mut service).await?;
                        self.observe(&mut service).await?;
                    }
                    result.outcome = if launched {
                        ServiceControlOutcome::Applied
                    } else {
                        ServiceControlOutcome::Failed {
                            error: ServiceFailure {
                                code: "service_restart_failed".into(),
                                message:
                                    "The service could not restart. Check its state and try again."
                                        .into(),
                            },
                        }
                    };
                }
                state.services.insert(service.service_id.clone(), service);
            }
        }
        state.receipts.insert(
            request.request_id,
            Receipt::Control {
                result: result.clone(),
            },
        );
        self.save(state).await?;
        Ok(ServiceLocalResponse::Control { result })
    }
}
