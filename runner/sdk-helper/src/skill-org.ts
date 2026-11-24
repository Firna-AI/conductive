import { basename, join } from 'node:path'

import type { Agent } from './generated/Agent'
import type { HelperSkillSource } from './generated/HelperSkillSource'
import type { OrgSkills } from './generated/OrgSkills'
import type { SkillEntry } from './generated/SkillEntry'
import type { SkillReadOutcome } from './generated/SkillReadOutcome'
import { isTrustedOrgSkills } from './providers/org-skills'
import { safeSkillContent } from './providers/skill-metadata'
import { selectAgentSkills } from './providers/skills'
import {
  readSkillContent,
  SKILL_NOT_FOUND,
  skillReadFailure,
  skillReadText,
} from './skill-content'
import { claudeSkill, codexSkill, readSkillFile } from './skill-read'

export interface OrgSkillsListRequest {
  repository: string
  orgSkills: OrgSkills | null
  agent: Agent
  warn: (message: string) => void
}

type OrgSkill = Awaited<ReturnType<typeof selectAgentSkills>>[number]

function orgSkillView(
  skill: OrgSkill,
  path: string,
  source: string,
  request: OrgSkillsListRequest,
) {
  const { agent, orgSkills, warn } = request
  const text = safeSkillContent(
    source,
    skill.path,
    agent,
    isTrustedOrgSkills(orgSkills),
  )
  const place = {
    path,
    folder: agent === 'claude' ? skill.alias : basename(skill.path),
  }
  const entry =
    agent === 'claude'
      ? claudeSkill(text, place, warn)
      : codexSkill(text, place, warn)
  return { text, entry }
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
  const selected = await selectAgentSkills(
    { cwd: repository, orgSkills, warn },
    agent,
  )
  const found: SkillEntry[] = []
  for (const skill of selected) {
    const path = join(skill.path, 'SKILL.md')
    const source = await readSkillFile(path, warn)
    if (source === null) continue
    const { entry } = orgSkillView(skill, path, source, request)
    if (entry) found.push({ ...entry, org: true })
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
    const selected = await selectAgentSkills(
      { cwd: repository, orgSkills, warn },
      agent,
    )
    const skill = selected.find((item) => item.shownName === name)
    if (!skill) return SKILL_NOT_FOUND
    const path = join(skill.path, 'SKILL.md')
    const result = await readSkillContent(path, maxBytes)
    if (!result.ok) return result
    const { entry, text } = orgSkillView(skill, path, result.text, {
      ...request,
      warn,
    })
    return entry?.name === name
      ? skillReadText(text, maxBytes)
      : SKILL_NOT_FOUND
  } catch (error) {
    return skillReadFailure(error)
  }
}
