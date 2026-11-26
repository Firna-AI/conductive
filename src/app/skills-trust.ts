import type { OrgSettings } from '../shared/org-settings'
import {
  isSkillsRepository,
  normalizeSkillsRepository,
} from '../shared/skill-folders'
import { effectiveTrustedSkillsRepository } from '../shared/skills-repository-settings'

/**
 * The skills repository of an org and its trust choice, as one value: the
 * text of the Repository field, and whether the switch "Trust this skills
 * repository" is on. An admin edits both in one draft, and Save repository
 * sends both in one write, as
 * [Save](../../docs/protocol/org-skills-trust.md#save) says.
 */
export interface SkillsChoice {
  repository: string
  trusted: boolean
}

/**
 * Whether two choices are the same. The draft compares them as one value,
 * so a newer saved value never pairs the trust of one repository with the
 * text of another.
 */
export function sameSkillsChoice(a: SkillsChoice, b: SkillsChoice): boolean {
  return a.repository === b.repository && a.trusted === b.trusted
}

/**
 * The saved choice: the saved repository, or empty text, and whether the
 * saved trusted repository names it. Trust holds only while both name the
 * same valid repository, without regard to letter case. A reply without a
 * trusted repository, such as one of an older Worker, is untrusted.
 */
export function savedSkillsChoice(settings: OrgSettings): SkillsChoice {
  const repository = settings.skillsRepository ?? ''
  const trusted = effectiveTrustedSkillsRepository(
    repository,
    settings.trustedSkillsRepository ?? '',
  )
  return { repository, trusted: trusted !== '' }
}

/**
 * Whether text names a repository: owner/name, or a link from GitHub that
 * Save stores as owner/name. Only such text has a trust choice, so the
 * switch shows only for it.
 */
export function namesSkillsRepository(text: string): boolean {
  return isSkillsRepository(normalizeSkillsRepository(text))
}

/**
 * Whether the text of the field names another repository than the saved
 * one, so its hint says that a new repository starts untrusted. Names match
 * without regard to letter case, as on GitHub.
 */
export function replacesSkillsRepository(text: string, saved: string): boolean {
  return normalizeSkillsRepository(text).toLowerCase() !== saved.toLowerCase()
}

/**
 * The saved trust choice of a read-only Skills section, or `undefined`
 * when the saved text names no repository, which has no choice and no
 * Trust row.
 */
export function savedSkillsTrust(settings: OrgSettings): boolean | undefined {
  const saved = savedSkillsChoice(settings)
  return namesSkillsRepository(saved.repository) ? saved.trusted : undefined
}
