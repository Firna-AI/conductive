import type { SkillsLookup } from '../../../../src/ui/components/settings/skillsCopy'
import type { SkillsTrust } from '../components/settings/SkillsTrust'
import {
  agentSkills,
  cutTreeSkills,
  invalidSkillsRepository,
  misspelledSkillsRepository,
  replacementSkillsRepository,
  skillsRepository,
  skillsRepositoryLink,
} from '../fixtures/computer'
import type { OrgSettingsState } from './orgSettingsState'

/**
 * The parts of the state of the org settings that the Skills section of
 * the Cloud computer tab shows. `orgSettingsState.ts` adds them to the
 * state of the screen.
 */
export const skillsProperties = {
  /**
   * The skills repository of the org, and what the lookup of the saved
   * repository found on GitHub: acme/agent-skills with its skills, none
   * chosen yet, or none with a link from GitHub that an admin pasted into
   * the field and has not saved. Then a saved repository that is private,
   * acme/agent-skils that GitHub does not find, a repository without
   * skills, a file tree that GitHub cut short, and a lookup that failed.
   * `invalid` saves agent-skills, which is not owner/name. A member sees
   * the saved repository and the same result. Firna, a new org, has none.
   */
  skills: {
    enum: [
      'chosen',
      'none',
      'pasted-link',
      'private',
      'not-found',
      'without-skills',
      'incomplete',
      'lookup-failed',
      'invalid',
    ],
  },
  /**
   * The trust choice of the repository, which an admin sets under the
   * field: untrusted, as each repository starts, or trusted. `unsaved` is
   * an untrusted repository that an admin turned on and has not saved.
   * `replaced` is a trusted repository after an admin typed
   * acme/team-skills in its place, so the switch is off until Save. A
   * member sees the saved choice. A value that names no repository has
   * no choice.
   */
  skillsTrust: { enum: ['untrusted', 'trusted', 'unsaved', 'replaced'] },
} as const

export const skillsKeys = ['skills', 'skillsTrust'] as const

/** acme/agent-skills with its skills, untrusted, as each repository starts. */
export const skillsDefaults = {
  skills: 'chosen',
  skillsTrust: 'untrusted',
} as const

/** A saved skills repository, and what its lookup found on GitHub. */
type SavedSkills = { repository?: string; lookup?: SkillsLookup }

/**
 * The skills repository of Acme in each state of the Skills section. Acme
 * has none yet, as every org starts, and a pasted link is not saved, so it
 * has none then either. Each other state saves a repository:
 * acme/agent-skills with its skills, private, without skills, with a file
 * tree that GitHub cut short, or with a lookup that failed, then
 * acme/agent-skils, which GitHub does not find, and agent-skills, which
 * GitHub does not find either.
 */
const acmeSkills: Readonly<Record<OrgSettingsState['skills'], SavedSkills>> = {
  chosen: {
    repository: skillsRepository,
    lookup: { result: 'found', skills: agentSkills },
  },
  none: {},
  'pasted-link': {},
  private: { repository: skillsRepository, lookup: { result: 'private' } },
  'not-found': {
    repository: misspelledSkillsRepository,
    lookup: { result: 'not-found' },
  },
  'without-skills': {
    repository: skillsRepository,
    lookup: { result: 'found', skills: [] },
  },
  incomplete: {
    repository: skillsRepository,
    lookup: { result: 'found', skills: cutTreeSkills, incomplete: true },
  },
  'lookup-failed': {
    repository: skillsRepository,
    lookup: { result: 'failed' },
  },
  invalid: {
    repository: invalidSkillsRepository,
    lookup: { result: 'not-found' },
  },
}

/**
 * The skills repository of Acme in a state, as the fields of its cloud
 * computer: the saved owner/name and the result of its lookup.
 */
export function acmeSkillsComputer(state: OrgSettingsState): {
  skillsRepository?: string
  skillsLookup?: SkillsLookup
} {
  const saved = acmeSkills[state.skills]
  return { skillsRepository: saved.repository, skillsLookup: saved.lookup }
}

/** Whether the saved value of Acme names a repository as owner/name. */
function savesName(state: OrgSettingsState): boolean {
  const { repository } = acmeSkills[state.skills]
  return repository !== undefined && repository !== invalidSkillsRepository
}

/**
 * The unsaved text of the Repository field of an admin: a link from
 * GitHub in the empty field, or acme/team-skills in place of a saved
 * repository. Firna has no saved repository to replace.
 */
export function skillsDraft(state: OrgSettingsState): string | undefined {
  if (state.skills === 'pasted-link') return skillsRepositoryLink
  const replaces = state.org !== 'new' && savesName(state)
  if (state.skillsTrust === 'replaced' && replaces) {
    return replacementSkillsRepository
  }
  return undefined
}

/**
 * The trust choice of the Skills section, while it names a repository. An
 * admin sees the field, so a pasted link names one too. A member and a
 * suspended org see the saved value. The choice of a saved repository
 * comes from the state, and the unsaved choice of an admin is on after the
 * switch, or off after another repository in the field. Firna has no
 * repository, and its pages show no pasted link with a choice.
 */
export function skillsTrust(
  state: OrgSettingsState,
  readOnly: boolean,
): SkillsTrust | undefined {
  if (state.org === 'new') return undefined
  const named = savesName(state)
  const saved =
    named &&
    (state.skillsTrust === 'trusted' || state.skillsTrust === 'replaced')
  if (readOnly) return named ? { saved } : undefined
  if (!named && state.skills !== 'pasted-link') return undefined
  switch (state.skillsTrust) {
    case 'unsaved':
      return { saved, draft: true }
    case 'replaced':
      return { saved, draft: false }
    case 'untrusted':
    case 'trusted':
      return { saved }
  }
}
