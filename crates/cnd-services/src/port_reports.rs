//! Add verified service ownership to the runner's existing selected port rows.

use std::collections::BTreeMap;
use std::sync::Arc;

use async_trait::async_trait;
use cnd_runner::error::Result;
use cnd_runner::ports::reporter::PortScanner;
use cnd_runner_interface::ports::ListeningPort;

use crate::manager::state::ServiceManager;

/// Existing eligibility and labels stay with the native scanner.
pub struct ServicePortScanner {
    /// The existing same-user scanner.
    pub scanner: Arc<dyn PortScanner>,
    /// Current generation-specific cgroup ownership.
    pub manager: Arc<dyn ServiceManager>,
}

#[async_trait]
impl PortScanner for ServicePortScanner {
    async fn scan(&self) -> Result<Vec<ListeningPort>> {
        let mut ports = self.scanner.scan().await?;
        let report = match self.manager.try_snapshot().await {
            Ok(Some(report)) => report,
            Ok(None) | Err(_) => return Ok(ports),
        };
        let owners: BTreeMap<_, _> =
            report
                .services
                .into_iter()
                .flat_map(|entry| {
                    entry.service.ports.into_iter().map(move |port| {
                        (u64::from(port), entry.service.identity.service_id.clone())
                    })
                })
                .collect();
        for port in &mut ports {
            port.service_id = owners.get(&port.port).cloned();
        }
        Ok(ports)
    }
}
