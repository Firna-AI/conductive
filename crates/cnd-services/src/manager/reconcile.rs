//! Reconcile saved intentions and actual units without launching another run.

use std::collections::BTreeMap;
use std::sync::atomic::Ordering;

use cnd_runner::json::codec::MAX_SAFE_INTEGER;
use cnd_runner_interface::services::local::ServiceLocalEntry;
use cnd_runner_interface::services::process::{
    ServiceIdentity, ServiceProcessResult, ServiceState, ServiceTarget,
};

use crate::error::{Error, Result};
use crate::records::{Registry, SavedService};

use super::state::SavedManager;

impl SavedManager {
    pub(super) async fn loaded<'a>(
        &self,
        slot: &'a mut Option<Registry>,
    ) -> Result<&'a mut Registry> {
        if self.reload.swap(false, Ordering::Relaxed) {
            *slot = None;
        }
        if slot.is_none() {
            let boot_id = self.effects.runtime.boot_id().await?;
            let saved = self.effects.store.load().await?;
            if saved
                .as_ref()
                .is_some_and(|state| state.revision > MAX_SAFE_INTEGER)
            {
                return Err(Error::internal_message(
                    "saved service revision exceeds the wire number range",
                ));
            }
            *slot = Some(match saved {
                Some(saved) if saved.boot_id == boot_id => saved,
                _ => Registry {
                    boot_id,
                    revision: 0,
                    repository: self.effects.repository.clone(),
                    services: BTreeMap::new(),
                    receipts: BTreeMap::new(),
                },
            });
        }
        match slot {
            Some(registry) => Ok(registry),
            None => Err(Error::internal_message("service registry did not load")),
        }
    }

    pub(super) async fn refresh(&self, state: &mut Registry) -> Result<()> {
        let mut changed = false;
        for service in state.services.values_mut() {
            let before = (
                service.status.clone(),
                service.ports.clone(),
                service.stopping,
            );
            self.observe(service).await?;
            changed |= before
                != (
                    service.status.clone(),
                    service.ports.clone(),
                    service.stopping,
                );
        }
        if changed {
            self.save(state).await?;
        }
        Ok(())
    }

    pub(super) async fn save(&self, state: &mut Registry) -> Result<()> {
        self.reload.store(true, Ordering::Relaxed);
        state.revision = state
            .revision
            .checked_add(1)
            .filter(|revision| *revision <= MAX_SAFE_INTEGER)
            .ok_or_else(|| {
                Error::internal_message("service report revision exceeds the wire number range")
            })?;
        self.effects.store.save(state.clone()).await?;
        self.reload.store(false, Ordering::Relaxed);
        Ok(())
    }

    pub(super) async fn observe(&self, service: &mut SavedService) -> Result<()> {
        let mut unit = self.effects.units.inspect(&service.unit).await?;
        if service.stopping && unit.running {
            self.effects.units.stop(&service.unit).await?;
            unit = self.effects.units.inspect(&service.unit).await?;
        }
        let complete = self.effects.store.completed(&service.unit).await?;
        let oom = unit.result == Some(ServiceProcessResult::OutOfMemory);
        if oom && unit.running {
            self.effects.units.stop(&service.unit).await?;
            unit.running = false;
        }
        if !unit.running || complete.is_some() || service.stopping || oom {
            service.ports.clear();
            if service.status.state == ServiceState::Running
                || service.stopping
                || (oom && service.status.result != Some(ServiceProcessResult::OutOfMemory))
            {
                let result = if oom {
                    ServiceProcessResult::OutOfMemory
                } else {
                    complete
                        .as_ref()
                        .map(|value| value.result.clone())
                        .or(unit.result)
                        .unwrap_or(ServiceProcessResult::StartFailed)
                };
                service.status.state = if service.stopping {
                    ServiceState::Stopped
                } else if result == (ServiceProcessResult::Exit { code: 0 }) {
                    ServiceState::Ended
                } else {
                    ServiceState::Failed
                };
                service.status.ended_at = Some(
                    complete
                        .map(|value| value.ended_at)
                        .unwrap_or_else(|| self.effects.runtime.now()),
                );
                service.status.result = Some(result);
            }
            service.stopping = false;
        } else {
            service.status.state = ServiceState::Running;
            service.status.ended_at = None;
            service.status.result = None;
            service.ports = match unit.cgroup {
                Some(cgroup) => self.effects.ports.scan(&cgroup).await?,
                None => vec![],
            };
        }
        Ok(())
    }

    pub(super) fn entry(&self, boot_id: &str, service: &SavedService) -> ServiceLocalEntry {
        ServiceLocalEntry {
            target: ServiceTarget {
                boot_id: boot_id.into(),
                identity: ServiceIdentity {
                    service_id: service.service_id.clone(),
                    generation: service.generation.clone(),
                },
            },
            name: service.name.clone(),
            command: service.definition.command.clone(),
            folder: service.definition.folder.clone(),
            status: service.status.clone(),
            ports: service.ports.clone(),
        }
    }
}
