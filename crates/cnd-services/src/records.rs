//! Private runtime registry and launch records. Nothing here enters a snapshot.

use std::collections::BTreeMap;
use std::path::PathBuf;

use cnd_runner_interface::api::Timestamp;
use cnd_runner_interface::services::control::ServiceControlResult;
use cnd_runner_interface::services::local::{ServiceDefinition, ServiceStartResult};
use cnd_runner_interface::services::process::{ServiceProcessResult, ServiceStatus};
use serde::{Deserialize, Serialize};

/// Registry that lasts only for one computer boot.
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Registry {
    /// Current kernel boot identity.
    pub boot_id: String,
    /// Full snapshot revision, retained across runner restarts.
    pub revision: u64,
    /// Current display root. Saved launch folders remain private definitions.
    #[serde(default)]
    pub repository: PathBuf,
    /// Records keyed by opaque identity, never a display name or path.
    pub services: BTreeMap<String, SavedService>,
    /// Mutation receipts retained until this computer stops.
    pub receipts: BTreeMap<String, Receipt>,
}

/// Saved definition and the current unit identity.
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedService {
    /// Opaque stable service identity.
    pub service_id: String,
    /// Exact display name, including an empty name or whitespace.
    pub name: String,
    /// Opaque current run identity.
    pub generation: String,
    /// Unit name derived only from generated identities.
    pub unit: String,
    /// Saved local definition, replaced only by a nonrunning Start.
    pub definition: ServiceDefinition,
    /// Original definition context, preserved through Restart.
    pub originating_turn_id: Option<String>,
    /// Last observed state and result.
    pub status: ServiceStatus,
    /// Last observed owned ports. A change advances the full snapshot revision.
    pub ports: Vec<u16>,
    /// An explicit Stop remains intended if the runner ends during the call.
    pub stopping: bool,
}

/// A receipt can contain no raw log source or environment map.
#[derive(Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Receipt {
    /// Actual or provisional Start result, persisted before launch.
    Start {
        /// Local correlation identity.
        request_id: String,
        /// Definition-free local result.
        result: ServiceStartResult,
    },
    /// A pending control is Unconfirmed until its final receipt is saved.
    Control {
        /// Original observed target and outcome.
        result: ServiceControlResult,
    },
}

/// The user-side helper reads this file after systemd changes the user.
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchRecord {
    /// Stable service identity, also used for its shared rotating log.
    pub service_id: String,
    /// Current run identity.
    pub generation: String,
    /// Current unit identity, used for its separate process result.
    pub unit: String,
    /// Exact supplied command and folder. Never privileged shell text.
    pub definition: ServiceDefinition,
    /// Frozen startup/base values plus explicit definition values only.
    pub environment: BTreeMap<String, String>,
}

/// Process result written by the unit-owned helper, before it exits.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompletedRun {
    /// Time when the process and its captured output ended.
    pub ended_at: Timestamp,
    /// Exit, signal, or command-start result.
    pub result: ServiceProcessResult,
}

/// State from the system manager, with no untrusted diagnostic text.
#[derive(Debug, Clone, PartialEq)]
pub struct UnitStatus {
    /// Whether this generation's unit currently runs.
    pub running: bool,
    /// Active control group, or none after the unit ends.
    pub cgroup: Option<String>,
    /// Result when not running, or a systemd-detected memory kill.
    pub result: Option<ServiceProcessResult>,
}
