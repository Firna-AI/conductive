//! Unlocked retained-output reads recheck the observed run before replying.

use cnd_runner_interface::services::local::ServiceLocalResponse;
use cnd_runner_interface::services::logs::{
    ServiceLogRequest, ServiceRawLogResponse, ServiceRawLogResult,
};

use crate::error::Result;
use crate::records::Registry;

use super::state::SavedManager;

fn invalid_target(state: &Registry, request: &ServiceLogRequest) -> Option<ServiceRawLogResult> {
    match state.services.get(&request.target.identity.service_id) {
        None => Some(ServiceRawLogResult::NotFound),
        Some(service)
            if state.boot_id != request.target.boot_id
                || service.generation != request.target.identity.generation =>
        {
            Some(ServiceRawLogResult::Stale)
        }
        Some(_) => None,
    }
}

impl SavedManager {
    pub(super) async fn read_logs(
        &self,
        request: ServiceLogRequest,
    ) -> Result<ServiceLocalResponse> {
        {
            let mut slot = self.state.lock().await;
            let state = self.loaded(&mut slot).await?;
            self.refresh(state).await?;
            if let Some(result) = invalid_target(state, &request) {
                return Ok(ServiceLocalResponse::Logs {
                    result: ServiceRawLogResponse { request, result },
                });
            }
        }
        let (bytes, omitted) = self
            .effects
            .logs
            .read(&request.target.identity.service_id)
            .await?;
        let result = {
            let mut slot = self.state.lock().await;
            let state = self.loaded(&mut slot).await?;
            invalid_target(state, &request).unwrap_or_else(|| ServiceRawLogResult::Ready {
                text: String::from_utf8_lossy(&bytes).into_owned(),
                omitted,
            })
        };
        Ok(ServiceLocalResponse::Logs {
            result: ServiceRawLogResponse { request, result },
        })
    }
}
