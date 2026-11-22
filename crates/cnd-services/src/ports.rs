//! Replaceable effects for units, runtime state, time, environment, and ports.

use std::collections::BTreeMap;
use std::future::Future;
use std::path::PathBuf;
use std::pin::Pin;

use async_trait::async_trait;
use cnd_runner_interface::api::Timestamp;

use crate::error::Result;
use crate::records::{CompletedRun, LaunchRecord, Registry, UnitStatus};

/// System-manager operations. All unit names come from generated identities.
#[cfg_attr(test, unimock::unimock(api = UnitsMock))]
#[async_trait]
pub trait Units: Send + Sync {
    /// Launch the current user-side helper with a private runtime record.
    async fn launch(&self, unit: &str, record: PathBuf) -> Result<()>;
    /// Stop the entire unit process tree.
    async fn stop(&self, unit: &str) -> Result<()>;
    /// Inspect actual unit state, including a missing unit or memory failure.
    async fn inspect(&self, unit: &str) -> Result<UnitStatus>;
}

/// Registry and helper records kept only in memory-backed runtime storage.
#[cfg_attr(test, unimock::unimock(api = StoreMock))]
#[async_trait]
pub trait Store: Send + Sync {
    /// Load the registry, acquiring the native manager's exclusive lifetime lock.
    async fn load(&self) -> Result<Option<Registry>>;
    /// Atomically replace the registry before any corresponding unit effect.
    async fn save(&self, state: Registry) -> Result<()>;
    /// Save a private helper record before launch and return its opaque path.
    async fn prepare(&self, record: LaunchRecord) -> Result<PathBuf>;
    /// Read the unit-owned result after a fast exit or runner restart.
    async fn completed(&self, unit: &str) -> Result<Option<CompletedRun>>;
}

/// Unit-owned reads and writes never acquire the manager's registry lock.
#[cfg_attr(test, unimock::unimock(api = RunFilesMock))]
#[async_trait]
pub trait RunFiles: Send + Sync {
    /// Read one private, already saved launch record as the sandbox user.
    async fn launch_record(&self, path: PathBuf) -> Result<LaunchRecord>;
    /// Save the real child result before the user-side helper exits.
    async fn finish(&self, unit: &str, result: CompletedRun) -> Result<()>;
}

/// Complete retained runtime logs. Public app filtering belongs to the Worker.
#[cfg_attr(test, unimock::unimock(api = LogsMock))]
#[async_trait]
pub trait Logs: Send + Sync {
    /// Append stdout or stderr without a runner-owned pipe or durable journal.
    async fn append(&self, service: &str, bytes: Vec<u8>) -> Result<()>;
    /// Read the complete retained bytes and whether rotation omitted older data.
    async fn read(&self, service: &str) -> Result<(Vec<u8>, bool)>;
}

/// Read listeners belonging to this exact unit control group or its descendants.
#[cfg_attr(test, unimock::unimock(api = OwnedPortsMock))]
#[async_trait]
pub trait OwnedPorts: Send + Sync {
    /// Apply the current same-user, address, and reserved-port rules.
    async fn scan(&self, cgroup: &str) -> Result<Vec<u16>>;
}

/// Startup settings are read independently of every caller's environment.
#[cfg_attr(test, unimock::unimock(api = StartupEnvironmentMock))]
#[async_trait]
pub trait StartupEnvironment: Send + Sync {
    /// Frozen org values and basic user/project variables, without app context.
    async fn read(&self) -> Result<BTreeMap<String, String>>;
}

/// Time, readiness polling, boot identity, and opaque identity generation.
#[cfg_attr(test, unimock::unimock(api = RuntimeMock))]
#[async_trait]
pub trait Runtime: Send + Sync {
    /// Current Unix milliseconds.
    fn now(&self) -> Timestamp;
    /// Monotonic milliseconds, used only for the fixed readiness wait.
    fn monotonic(&self) -> u64;
    /// Wait for another readiness observation, without recording activity.
    fn wait(&self) -> Pin<Box<dyn Future<Output = ()> + Send>>;
    /// Make an opaque service or generation identity.
    fn identity(&self) -> String;
    /// Identity of this computer boot, unchanged by runner restarts.
    async fn boot_id(&self) -> Result<String>;
}
