import type { Agent } from './generated/Agent'
import type { HelperSkillSource } from './generated/HelperSkillSource'
import type { OrgSkills } from './generated/OrgSkills'
import type { SkillEntry } from './generated/SkillEntry'
import type { SkillReadOutcome } from './generated/SkillReadOutcome'
import { isTrustedOrgSkills } from './providers/org-skills'
import { safeSkillBody, safeSkillContent } from './providers/skill-metadata'
import { selectAgentSkills } from './providers/skills'
import {
  readFirstSkillLine,
  readSkillContent,
  SKILL_NOT_FOUND,
  skillReadFailure,
  skillReadText,
} from './skill-content'
import {
  listedSkillText,
  orgSkillEntry,
  skillDescriptionLine,
} from './skill-read'

export interface OrgSkillsListRequest {
  repository: string
  orgSkills: OrgSkills | null
  agent: Agent
  warn: (message: string) => void
}

/**
 * The org skills that an agent start in this repository loads. The choice
 * is the one of a turn: a workspace skill wins, and a repeated name loads
 * once. The name and the description come from the safe view that the
 * agent reads. Each path is the `SKILL.md` of the copy, which a turn maps
 * to its own view.
 */
export async function listOrgSkills(
  request: OrgSkillsListRequest,
): Promise<SkillEntry[]> {
  const { repository, orgSkills, agent, warn } = request
  if (!orgSkills?.directory) return []
  const trusted = isTrustedOrgSkills(orgSkills)
  const { selected } = await selectAgentSkills(
    { cwd: repository, orgSkills, warn },
    agent,
  )
  const found: SkillEntry[] = []
  for (const skill of selected) {
    const { file, path } = skill.metadata
    if (!file.ok) {
      listedSkillText(file, path, warn)
      continue
    }
    const entry = orgSkillEntry(skill, agent)
    if (!entry) continue
    if (!entry.description) {
      const line = listedSkillText(
        await readFirstSkillLine(entry.path, 'org', file.bodyOffset),
        entry.path,
        warn,
      )
      if (line === null) continue
      entry.description = skillDescriptionLine(
        safeSkillBody(line, agent, trusted),
      )
    }
    found.push(entry)
  }
  return found
}

/** Select the named skill again in the current leased copy. */
export async function readOrgSkill(
  request: Extract<HelperSkillSource, { type: 'org' }>,
  maxBytes: number,
): Promise<SkillReadOutcome> {
  const { repository, orgSkills, agent, name } = request
  const warn = () => {}
  try {
    const { selected } = await selectAgentSkills(
      { cwd: repository, orgSkills, warn },
      agent,
    )
    const skill = selected.find((skill) => skill.shownName === name)
    if (!skill) return SKILL_NOT_FOUND
    const { metadata } = skill
    if (!metadata.file.ok) return metadata.file
    const body = await readSkillContent(
      metadata.path,
      maxBytes,
      'org',
      metadata.file.bodyOffset,
    )
    if (!body.ok) return body
    if (!orgSkillEntry(skill, agent)) return SKILL_NOT_FOUND
    return skillReadText(
      safeSkillContent(
        metadata,
        body.text,
        agent,
        isTrustedOrgSkills(orgSkills),
      ),
      maxBytes,
    )
  } catch (error) {
    return skillReadFailure(error)
  }
}
