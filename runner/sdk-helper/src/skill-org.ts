import { basename, join } from 'node:path'

import type { Agent } from './generated/Agent'
import type { OrgSkills } from './generated/OrgSkills'
import type { SkillEntry } from './generated/SkillEntry'
import { isTrustedOrgSkills } from './providers/org-skills'
import { safeSkillContent } from './providers/skill-metadata'
import { selectAgentSkills } from './providers/skills'
import { claudeSkill, codexSkill, readSkillFile } from './skill-read'

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
  const selected = await selectAgentSkills(
    { cwd: repository, orgSkills, warn },
    agent,
  )
  const found: SkillEntry[] = []
  for (const skill of selected) {
    const path = join(skill.path, 'SKILL.md')
    const source = await readSkillFile(path, warn)
    if (source === null) continue
    const safe = safeSkillContent(source, skill.path, agent, trusted)
    // Claude finds each org skill through a link named by its alias.
    const place = {
      path,
      folder: agent === 'claude' ? skill.alias : basename(skill.path),
    }
    const entry =
      agent === 'claude'
        ? claudeSkill(safe, place, warn)
        : codexSkill(safe, place, warn)
    if (entry) found.push(entry)
  }
  return found
}
