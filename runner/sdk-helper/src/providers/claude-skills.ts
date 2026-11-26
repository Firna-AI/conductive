import type { Settings } from '@anthropic-ai/claude-agent-sdk'

import { isSkillsRepository } from '../../../../src/shared/skill-folders'
import type { OrgSkills } from '../generated/OrgSkills'
import type { ProviderLifetime } from './lifetime'
import { isTrustedOrgSkills } from './org-skills'
import { prepareSkillView } from './skill-view'
import type { ProviderOptions } from './types'

/**
 * The discovery folder of the org skills view, and the name that Claude
 * shows for each of its skills, as the Claude list names it.
 */
export async function prepareClaudeSkills(
  options: ProviderOptions,
  lifetime: ProviderLifetime,
): Promise<{ directory: string | null; names: ReadonlySet<string> }> {
  const view = await prepareSkillView(options, 'claude', lifetime)
  return {
    directory: view?.claudeDirectory ?? null,
    names: new Set(view?.skills.map((skill) => skill.shownName) ?? []),
  }
}

export function claudeSkillSettings(
  skills: OrgSkills | null | undefined,
): Pick<Settings, 'disableSkillShellExecution'> {
  return skills &&
    isSkillsRepository(skills.repository) &&
    !isTrustedOrgSkills(skills)
    ? { disableSkillShellExecution: true }
    : {}
}
