//! JSON line messages between the runner and its SDK helper child.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::agents::{Agent, AgentChoice};
use crate::provider_events::ProviderEvent;
use crate::runner_skills::SkillReadOutcome;
use crate::sdk_helper_options::{HelperOptions, OrgSkills, ProviderInput};
use crate::skills::{HelperSkillLists, SkillInput};
use crate::wire::ReadonlyVec;

/// One runner request. Scans and skill reads have their own results.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(
    tag = "type",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
pub enum HelperRequest {
    /// Start one agent process.
    Start {
        /// Request identity.
        request_id: String,
        /// Private start options.
        options: Box<HelperOptions>,
    },
    /// Deliver input in order.
    Send {
        /// Request identity.
        request_id: String,
        /// Agent input.
        input: Box<ProviderInput>,
        /// Current private Codex paths. Absent for measurement clients.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(as = "Option<ReadonlyVec<SkillInput>>", optional)]
        skills: Option<Vec<SkillInput>>,
    },
    /// Change the selected model or defer the change.
    Model {
        /// Request identity.
        request_id: String,
        /// New model and effort.
        choice: AgentChoice,
    },
    /// Interrupt the current reply.
    Interrupt {
        /// Request identity.
        request_id: String,
    },
    /// Close the agent and wait for exit and credential cleanup.
    Close {
        /// Request identity.
        request_id: String,
    },
    /// Read the Claude program to warm its disk pages, then exit.
    Warm {
        /// Request identity.
        request_id: String,
    },
    /// Scan agent skills without starting a model session.
    Skills {
        /// Request identity.
        request_id: String,
        /// Repository whose agent skills are listed.
        repository: String,
        /// Shared agent home, including the shared Codex home.
        home: String,
        /// Force a new Codex app-server list after a connect or refresh.
        reload: bool,
        /// Org source, trust, and leased copy. Its selected skills join both lists.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        #[ts(optional = nullable)]
        org_skills: Option<OrgSkills>,
    },
    /// Read one skill without starting an agent session.
    #[serde(rename = "skill.read")]
    SkillRead {
        /// Private request identity.
        request_id: String,
        /// Maximum bytes to return.
        #[ts(type = "number")]
        max_bytes: u64,
        /// Private lookup data supplied by the runner.
        source: HelperSkillSource,
    },
}

/// Read a discovered file or select the org skill from a leased copy.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(
    tag = "type",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
pub enum HelperSkillSource {
    /// File path from this agent's latest scan.
    File {
        /// The path stays on the private helper pipe.
        path: String,
    },
    /// Org skill selected again in the current copy.
    Org {
        /// Workspace repository, for skill precedence.
        repository: String,
        /// Configured source, trust, and leased copy.
        org_skills: OrgSkills,
        /// Agent whose skill is requested.
        agent: Agent,
        /// Name from that agent's skills list.
        name: String,
    },
}

/// Result of a model change.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "lowercase")]
pub enum HelperModelResult {
    /// The process accepted the new choice.
    Applied,
    /// The engine must start another process at a safe boundary.
    Deferred,
}

/// Output written by the helper. No diagnostic includes request bytes.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum HelperOutput {
    /// Private scanner reply, before filtering and report bounds.
    #[serde(rename = "skills")]
    Skills {
        /// Matching scanner request identity.
        request_id: String,
        /// Full discovered lists, including private paths.
        skills: HelperSkillLists,
    },
    /// Text or public error from a private skill read.
    #[serde(rename = "skill.read.result")]
    SkillRead {
        /// Matching private request identity.
        request_id: String,
        /// Read outcome.
        result: SkillReadOutcome,
    },
    /// A request finished.
    #[serde(rename = "response")]
    Response {
        /// Matching request identity.
        request_id: String,
        /// Model outcome, or null for another request.
        result: Option<HelperModelResult>,
    },
    /// A request failed.
    #[serde(rename = "error")]
    Error {
        /// Matching request identity.
        request_id: String,
        /// Stable failure code.
        code: String,
        /// Displayable failure cause.
        message: String,
    },
    /// Agent output before filtering by the runner.
    #[serde(rename = "event")]
    Event {
        /// Provider output.
        event: ProviderEvent,
    },
    /// Fixed diagnostic from the adapter.
    #[serde(rename = "warning")]
    Warning {
        /// Diagnostic text.
        message: String,
    },
    /// Updated work IDs named in a background note.
    #[serde(rename = "background.notes")]
    BackgroundNotes {
        /// Complete named work set.
        #[ts(as = "ReadonlyVec<String>")]
        ids: Vec<String>,
    },
    /// Agent cleanup finished. The client still waits for OS process exit.
    #[serde(rename = "exit")]
    Exit,
}
