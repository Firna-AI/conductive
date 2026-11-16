import type { SkillsLookup } from '../components/settings/skillsCopy'
import {
  agentSkills,
  cutTreeSkills,
  misspelledSkillsRepository,
  skillsRepository,
} from '../fixtures/computer'
import type { OrgSettingsState } from './OrgSettingsScreen'

/** A saved skills repository, and what its lookup found on GitHub. */
type SavedSkills = { repository?: string; lookup?: SkillsLookup }

/**
 * The skills repository of Acme in each state of the Skills section. Acme
 * has none yet, as every org starts, and a pasted link is not saved, so it
 * has none then either. Each other state saves a repository:
 * acme/agent-skills with its skills, private, without skills, with a file
 * tree that GitHub cut short, or with a lookup that failed, or
 * acme/agent-skils, which GitHub does not find.
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
