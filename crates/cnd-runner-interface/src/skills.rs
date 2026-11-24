//! Skill reports and private scanner results shared with the SDK helper.

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::wire::{ReadonlyVec, WireTrue};

/// Most skills reported for each agent.
pub const SKILL_REPORT_MAX_SKILLS: usize = 200;
/// Display excerpt applied by the workspace after its final credential filter.
pub const SKILL_DESCRIPTION_MAX_CHARACTERS: usize = 300;
/// A longer description is omitted whole before sending the report.
pub const SKILL_DESCRIPTION_REPORT_MAX_CHARACTERS: usize = 4096;
/// Longest name that a skill text can hold.
pub const SKILL_NAME_MAX_CHARACTERS: usize = 256;
/// Complete skill report byte budget, excluding its envelope.
pub const SKILL_REPORT_MAX_BYTES: usize = 524_288;

/// Skill metadata displayed by the app. Private paths never enter this type.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(rename_all = "camelCase")]
pub struct AgentSkill {
    /// Name used by a member to invoke the skill.
    pub name: String,
    /// Whole description, or empty when omitted by the report budget.
    pub description: String,
    /// Whether only an explicit member request can invoke this skill.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub manual_only: Option<bool>,
}

/// Latest list for each agent, including an empty list.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
pub struct SkillLists {
    /// Skills available to Claude.
    #[ts(as = "ReadonlyVec<AgentSkill>")]
    pub claude: Vec<AgentSkill>,
    /// Skills available to Codex.
    #[ts(as = "ReadonlyVec<AgentSkill>")]
    pub codex: Vec<AgentSkill>,
}

/// Complete replacement report from the runner.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type")]
pub enum RunnerSkillsUpdated {
    /// Skill names and descriptions without private paths.
    #[serde(rename = "skills.updated")]
    SkillsUpdated {
        /// Skills available to Claude.
        #[ts(as = "ReadonlyVec<AgentSkill>")]
        claude: Vec<AgentSkill>,
        /// Skills available to Codex.
        #[ts(as = "ReadonlyVec<AgentSkill>")]
        codex: Vec<AgentSkill>,
    },
}

/// Workspace state sent to tabs. Null marks an unavailable list.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
#[serde(tag = "type")]
pub enum SkillsUpdated {
    /// A replacement list, or an unavailable result.
    #[serde(rename = "skills.updated")]
    SkillsUpdated {
        /// Filtered lists, or null after a missing or failed report.
        skills: Option<SkillLists>,
    },
}

/// Private discovered skill with the absolute path of its SKILL.md.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
pub struct SkillEntry {
    /// Full metadata, before the runner filters credentials and applies limits.
    #[serde(flatten)]
    pub skill: AgentSkill,
    /// Absolute input path, never saved in a public report.
    pub path: String,
    /// Present for a skill from the org copy.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[ts(optional)]
    pub org: Option<WireTrue>,
}

/// Scanner result kept only in runner memory and private helper pipes.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, TS)]
pub struct HelperSkillLists {
    /// Claude scanner results.
    #[ts(as = "ReadonlyVec<SkillEntry>")]
    pub claude: Vec<SkillEntry>,
    /// Codex app-server or fallback results.
    #[ts(as = "ReadonlyVec<SkillEntry>")]
    pub codex: Vec<SkillEntry>,
}

/// Private explicit Codex skill input selected from the latest scan.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, TS)]
pub struct SkillInput {
    /// Skill name used in the member's text.
    pub name: String,
    /// Absolute path accepted by the Codex app server.
    pub path: String,
}
