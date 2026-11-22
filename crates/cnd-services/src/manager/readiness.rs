//! Bounded owned-port waits, with other local controls free to take the lock.

use cnd_runner_interface::services::local::{
    SERVICE_READINESS_MAX_SECONDS, ServicePortWait, ServiceReadiness, ServiceStartResult,
};
use cnd_runner_interface::services::process::ServiceState;

use crate::error::Result;
use crate::records::SavedService;

use super::state::SavedManager;

impl SavedManager {
    pub(super) async fn wait_for_port(
        &self,
        result: &mut ServiceStartResult,
        observed: &mut SavedService,
        wait: ServicePortWait,
    ) -> Result<()> {
        let began = self.effects.runtime.monotonic();
        loop {
            {
                let mut slot = self.state.lock().await;
                let state = self.loaded(&mut slot).await?;
                self.refresh(state).await?;
                if let Some(current) = state
                    .services
                    .get(&observed.service_id)
                    .filter(|current| current.generation == observed.generation)
                {
                    *observed = current.clone();
                } else {
                    self.observe(observed).await?;
                }
            }
            result.service = self.entry(&result.service.target.boot_id, observed);
            let ready = observed
                .ports
                .iter()
                .find(|port| match wait {
                    ServicePortWait::First => true,
                    ServicePortWait::Port { port: wanted } => **port == wanted,
                })
                .copied();
            if let Some(port) = ready {
                result.readiness = ServiceReadiness::Ready { port };
                return Ok(());
            }
            if observed.status.state != ServiceState::Running {
                result.readiness = ServiceReadiness::Ended;
                return Ok(());
            }
            if self.effects.runtime.monotonic().saturating_sub(began)
                >= SERVICE_READINESS_MAX_SECONDS * 1000
            {
                result.readiness = ServiceReadiness::NotConfirmed;
                return Ok(());
            }
            self.effects.runtime.wait().await;
        }
    }
}
