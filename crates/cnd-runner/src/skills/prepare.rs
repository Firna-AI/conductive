//! Whole-source filtering precedes skill counts and whole-description omission.

use std::collections::HashSet;

use cnd_runner_interface::runner::RunnerEvent;
use cnd_runner_interface::skills::{
    AgentSkill, HelperSkillLists, RunnerSkillsUpdated, SKILL_DESCRIPTION_REPORT_MAX_CHARACTERS,
    SKILL_NAME_MAX_CHARACTERS, SKILL_REPORT_MAX_BYTES, SKILL_REPORT_MAX_SKILLS,
};

use crate::error::{Error, Result};
use crate::json::codec;
use crate::reports::prepare::ReportFilter;

pub(super) fn report(
    lists: &HelperSkillLists,
    filter: &dyn ReportFilter,
) -> Result<RunnerSkillsUpdated> {
    let event = filter.report(RunnerEvent::RunnerSkillsUpdated(
        RunnerSkillsUpdated::SkillsUpdated {
            claude: lists
                .claude
                .iter()
                .map(|entry| entry.skill.clone())
                .collect(),
            codex: lists
                .codex
                .iter()
                .map(|entry| entry.skill.clone())
                .collect(),
        },
    ))?;
    let RunnerEvent::RunnerSkillsUpdated(mut report) = event else {
        return Err(Error::HelperResponse);
    };
    bound(&mut report)?;
    Ok(report)
}

fn valid_name(name: &str) -> bool {
    !name.is_empty()
        && name.chars().count() <= SKILL_NAME_MAX_CHARACTERS
        && !name
            .chars()
            .any(|point| point.is_whitespace() || point.is_control() || point == '\u{feff}')
}

fn entries(entries: &mut Vec<AgentSkill>) {
    let mut seen = HashSet::new();
    entries.retain(|entry| {
        let keep = valid_name(&entry.name) && seen.insert(entry.name.clone());
        if !keep {
            tracing::warn!("A skill has an unusable or repeated name. The report leaves it out.");
        }
        keep
    });
    entries.sort_by(|left, right| left.name.encode_utf16().cmp(right.name.encode_utf16()));
    if entries.len() > SKILL_REPORT_MAX_SKILLS {
        tracing::warn!("The skill report keeps the first 200 skills of each agent by name.");
        entries.truncate(SKILL_REPORT_MAX_SKILLS);
    }
    for entry in entries {
        if entry.description.chars().count() > SKILL_DESCRIPTION_REPORT_MAX_CHARACTERS {
            tracing::warn!(
                "A skill description exceeds 4096 characters. The report leaves it out."
            );
            entry.description.clear();
        }
        if entry.manual_only == Some(false) {
            entry.manual_only = None;
        }
    }
}

pub(crate) fn bound(report: &mut RunnerSkillsUpdated) -> Result<()> {
    let RunnerSkillsUpdated::SkillsUpdated { claude, codex } = report;
    entries(claude);
    entries(codex);
    let descriptions: Vec<_> = claude
        .iter_mut()
        .chain(codex.iter_mut())
        .map(|entry| std::mem::take(&mut entry.description))
        .collect();
    let mut bytes = codec::encode(report)?.len();
    let RunnerSkillsUpdated::SkillsUpdated { claude, codex } = report;
    for (entry, description) in claude.iter_mut().chain(codex.iter_mut()).zip(descriptions) {
        let added = codec::encode(&description)?.len() - 2;
        if bytes + added <= SKILL_REPORT_MAX_BYTES {
            entry.description = description;
            bytes += added;
        } else {
            tracing::warn!("The skill report budget leaves out a whole description.");
        }
    }
    Ok(())
}
