//! Skill reads and their results stay outside the chat event log.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::agents::Agent;
use crate::wire::{WireFalse, WireTrue};

/// Read the skill that the latest scan lists for the named agent.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerReadSkill {
    /// Read skill text by name.
    #[serde(rename = "skill.read")]
    Read {
        /// Request identity.
        request_id: String,
        /// Agent whose skill is requested.
        agent: Agent,
        /// Name from that agent's skills list.
        name: String,
        /// Maximum bytes the backend permits.
        #[ts(type = "number")]
        max_bytes: u64,
    },
}

/// A failed skill read, with a public message.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "code", rename_all_fields = "camelCase")]
pub enum RunnerSkillError {
    /// The named skill or its file is missing.
    #[serde(rename = "skill_not_found")]
    NotFound {
        /// Public error text.
        message: String,
    },
    /// The runner could not read the skill.
    #[serde(rename = "skill_unavailable")]
    Unavailable {
        /// Public error text.
        message: String,
    },
    /// The skill exceeds the effective byte limit.
    #[serde(rename = "skill_too_large")]
    TooLarge {
        /// Public error text.
        message: String,
        /// Size in bytes.
        #[ts(type = "number")]
        size_bytes: u64,
        /// Effective maximum in bytes.
        #[ts(type = "number")]
        limit_bytes: u64,
    },
}

/// Skill text or a public error, with a literal boolean discriminator.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(untagged)]
pub enum SkillReadOutcome {
    /// Read succeeded.
    Success {
        /// Always true.
        ok: WireTrue,
        /// The SKILL.md text that the agent reads.
        text: String,
    },
    /// Read failed.
    Failure {
        /// Always false.
        ok: WireFalse,
        /// Public skill error.
        error: RunnerSkillError,
    },
}

/// Skill response with its request identity.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type", rename_all_fields = "camelCase")]
pub enum RunnerSkillResult {
    /// Response to a skill read.
    #[serde(rename = "skill.read.result")]
    Read {
        /// Request identity.
        request_id: String,
        /// Read outcome.
        result: SkillReadOutcome,
    },
}
