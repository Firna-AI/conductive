import { join } from 'node:path'

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

/** The runner keeps the copies of the skills repository here, as `DiskSkills` of the Rust runner says. */
export function orgSkillsCopyRoot(home: string): string {
  return join(home, '.conductive', 'skills')
}
