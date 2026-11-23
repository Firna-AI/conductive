import { effectiveTrustedSkillsRepository } from '../../../../src/shared/skills-repository-settings'
import type { OrgSkills } from '../generated/OrgSkills'

export function isTrustedOrgSkills(
  skills: OrgSkills | null | undefined,
): boolean {
  return (
    skills != null &&
    effectiveTrustedSkillsRepository(
      skills.repository,
      skills.trustedRepository ?? '',
    ) !== ''
  )
}
