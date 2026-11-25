import { join } from 'node:path'

import type { Agent } from './generated/Agent'
import type { HelperSkillSource } from './generated/HelperSkillSource'
import type { OrgSkills } from './generated/OrgSkills'
import type { SkillEntry } from './generated/SkillEntry'
import type { SkillReadOutcome } from './generated/SkillReadOutcome'
import { isTrustedOrgSkills } from './providers/org-skills'
import { safeSkillContent } from './providers/skill-metadata'
import { selectAgentSkills, type SelectedOrgSkill } from './providers/skills'
import {
  SKILL_FILE_MAX_BYTES,
  SKILL_NOT_FOUND,
  skillFileResult,
  skillReadFailure,
  skillReadText,
} from './skill-content'
import { claudeSkill, codexSkill, listedSkillText } from './skill-read'

export interface OrgSkillsListRequest {
  repository: string
  orgSkills: OrgSkills | null
  agent: Agent
  warn: (message: string) => void
}

function orgSkillView(
  skill: SelectedOrgSkill,
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
  const place = { path, folder: skill.shownName }
  const entry =
    agent === 'claude'
      ? claudeSkill(text, place, warn)
      : codexSkill(text, place, warn)
  return { text, entry: entry && { ...entry, name: skill.shownName } }
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
  const found: SkillEntry[] = []
  await selectAgentSkills(
    { cwd: repository, orgSkills, warn },
    agent,
    (skill, file) => {
      const path = join(skill.path, 'SKILL.md')
      const source = listedSkillText(
        skillFileResult(file, SKILL_FILE_MAX_BYTES),
        path,
        warn,
      )
      if (source === null) return
      const { entry } = orgSkillView(skill, path, source, request)
      if (entry) found.push({ ...entry, org: true })
    },
  )
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
    let result: SkillReadOutcome = SKILL_NOT_FOUND
    await selectAgentSkills(
      { cwd: repository, orgSkills, warn },
      agent,
      (skill, file) => {
        if (skill.shownName !== name) return
        const source = skillFileResult(file, maxBytes)
        if (!source.ok) {
          result = source
          return
        }
        const path = join(skill.path, 'SKILL.md')
        const { entry, text } = orgSkillView(skill, path, source.text, {
          ...request,
          warn,
        })
        if (entry) result = skillReadText(text, maxBytes)
      },
    )
    return result
  } catch (error) {
    return skillReadFailure(error)
  }
}
