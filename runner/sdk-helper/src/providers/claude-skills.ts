import type { Settings } from '@anthropic-ai/claude-agent-sdk'

import { isSkillsRepository } from '../../../../src/shared/skill-folders'
import type { OrgSkills } from '../generated/OrgSkills'
import type { ProviderLifetime } from './lifetime'
import { isTrustedOrgSkills } from './org-skills'
import { prepareSkillView } from './skill-view'
import type { ProviderOptions } from './types'

export async function prepareClaudeSkills(
  options: ProviderOptions,
  lifetime: ProviderLifetime,
): Promise<string | null> {
  const view = await prepareSkillView(options, 'claude', lifetime)
  return view?.claudeDirectory ?? null
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
