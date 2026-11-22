import type { OrgSettings, UpdateOrgSettingsRequest } from './org-settings'
import { isSkillsRepository, normalizeSkillsRepository } from './skill-folders'

type SkillsSettings = Pick<
  OrgSettings,
  'skillsRepository' | 'trustedSkillsRepository'
>
type SkillsUpdate = Pick<
  UpdateOrgSettingsRequest,
  'skillsRepository' | 'trustedSkillsRepository'
>

/** Only matching, valid names supply a trusted repository identity. */
export function effectiveTrustedSkillsRepository(
  repository: string,
  trusted: string,
): string {
  return isSkillsRepository(repository) &&
    isSkillsRepository(trusted) &&
    repository.toLowerCase() === trusted.toLowerCase()
    ? trusted.toLowerCase()
    : ''
}

/** Recompute the pair against the current row on every save attempt. */
export function savedSkillsRepositorySettings(
  current: SkillsSettings,
  update: SkillsUpdate,
): Required<SkillsSettings> {
  const skillsRepository =
    update.skillsRepository === undefined
      ? (current.skillsRepository ?? '')
      : normalizeSkillsRepository(update.skillsRepository)
  const trusted =
    update.trustedSkillsRepository === undefined
      ? effectiveTrustedSkillsRepository(
          current.skillsRepository ?? '',
          current.trustedSkillsRepository ?? '',
        )
      : normalizeSkillsRepository(update.trustedSkillsRepository)
  return {
    skillsRepository,
    trustedSkillsRepository: effectiveTrustedSkillsRepository(
      skillsRepository,
      trusted,
    ),
  }
}
