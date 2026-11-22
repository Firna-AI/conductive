//! Injected effects and the shared registry lock of a service manager.

use std::path::PathBuf;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;

use async_trait::async_trait;
use cnd_runner_interface::services::local::{ServiceLocalRequest, ServiceLocalResponse};
use cnd_runner_interface::services::reports::ServiceReport;
use tokio::sync::Mutex;

use crate::error::Result;
use crate::ports::{Logs, OwnedPorts, Runtime, StartupEnvironment, Store, Units};
use crate::records::Registry;

/// Effects composed once per runner process.
#[derive(Clone)]
pub struct Dependencies {
    /// System manager for generation-specific units.
    pub units: Arc<dyn Units>,
    /// Private runtime registry, definitions, and receipts.
    pub store: Arc<dyn Store>,
    /// Unit-owned rotating output.
    pub logs: Arc<dyn Logs>,
    /// Exact control-group port ownership.
    pub ports: Arc<dyn OwnedPorts>,
    /// Isolated frozen startup and basic user values.
    pub environment: Arc<dyn StartupEnvironment>,
    /// Time and identities independent of agent activity.
    pub runtime: Arc<dyn Runtime>,
    /// Home and repository roots for the existing selected-folder rule.
    pub home: PathBuf,
    /// Current repository root, without changing any saved definition folder.
    pub repository: PathBuf,
}

/// Public service operations. Callers consume this boundary through dyn dispatch.
#[cfg_attr(test, unimock::unimock(api = ServiceManagerMock))]
#[async_trait]
pub trait ServiceManager: Send + Sync {
    /// Update label selection after a repository move, without changing definitions.
    async fn repository(&self, root: PathBuf) -> Result<()>;
    /// Load and reconcile actual units after each runner start.
    async fn reconcile(&self) -> Result<()>;
    /// Execute a local request without a workspace token or an active turn.
    async fn call(&self, request: ServiceLocalRequest) -> Result<ServiceLocalResponse>;
    /// Capture a complete selected report without activating Worker traffic.
    async fn snapshot(&self) -> Result<ServiceReport>;
    /// Reconcile and persist a higher revision for a newly accepted connection.
    async fn fresh_snapshot(&self) -> Result<ServiceReport>;
    /// Enrich ordinary ports only when no native operation holds the registry.
    async fn try_snapshot(&self) -> Result<Option<ServiceReport>>;
}

/// Registry owner. A readiness wait releases the registry lock between observations.
pub struct SavedManager {
    pub(super) effects: Dependencies,
    pub(super) state: Mutex<Option<Registry>>,
    pub(super) reload: AtomicBool,
}

impl SavedManager {
    /// Compose a manager without reading settings, files, units, or the clock.
    pub fn new(effects: Dependencies) -> Self {
        Self {
            effects,
            state: Mutex::new(None),
            reload: AtomicBool::new(false),
        }
    }
}
