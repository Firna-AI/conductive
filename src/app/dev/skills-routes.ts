import {
  agentSkills,
  cutTreeSkills,
  misspelledSkillsRepository,
  skillsRepository,
} from '../../../docs/mockups/src/fixtures/computer'
import {
  orgSettingsPaths,
  type SkillsRepositoryLookupResponse,
} from '../../shared/org-settings'
import { savedSkillsRepositorySettings } from '../../shared/skills-repository-settings'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import { requireOrg, type DevBackend } from './backend'
import type { DevSkills } from './options'
import { ID, json, RouteError, type Route } from './router'
import type { DevState } from './state'

/**
 * Saves the skills repository of Acme that `?skills` chooses: none, the
 * misspelled acme/agent-skils, or else acme/agent-skills. With `trusted`,
 * from `?skillsTrust=trusted`, Acme trusts a saved repository, as the
 * shared save rule stores it.
 */
export function seedSkills(
  state: DevState,
  skills: DevSkills | null,
  trusted: boolean,
): void {
  const acme = state.orgs.find((org) => org.org.id === FAKE_IDS.org)
  if (!acme) return
  const repository =
    skills === 'none'
      ? ''
      : skills === 'not-found'
        ? misspelledSkillsRepository
        : skillsRepository
  acme.settings = {
    ...acme.settings,
    ...savedSkillsRepositorySettings(acme.settings, {
      skillsRepository: repository,
      trustedSkillsRepository: trusted ? repository : '',
    }),
  }
}

/**
 * The lookup of the saved repository, as the Worker answers it from
 * GitHub. The fake knows only acme/agent-skills, so it finds no other
 * repository. `skills` gives each other answer for any saved repository,
 * also the refusal of an expired GitHub sign-in.
 */
function lookup(repository: string, skills: DevSkills | null): Response {
  const reply = (fields: Partial<SkillsRepositoryLookupResponse>) =>
    json({
      repository,
      skills: [],
      notice: null,
      clashes: [],
      ...fields,
    } satisfies SkillsRepositoryLookupResponse)
  if (repository === '') return reply({})
  switch (skills) {
    case 'private':
      return reply({ notice: 'private' })
    case 'without-skills':
      return reply({ notice: 'no-skills' })
    case 'incomplete':
      return reply({ skills: cutTreeSkills, notice: 'incomplete' })
    case 'lookup-failed':
      return reply({ notice: 'failed' })
    case 'expired':
      throw new RouteError(
        401,
        'github_reconnect_required',
        'GitHub access expired. Sign in with GitHub again.',
      )
    default:
      return repository === skillsRepository
        ? reply({ skills: agentSkills })
        : reply({ notice: 'not-found' })
  }
}

/** The lookup of the skills repository of an org, which the Skills section shows. */
export function skillsRoutes(
  backend: DevBackend,
  skills: DevSkills | null,
): Route[] {
  return [
    {
      method: 'GET',
      path: orgSettingsPaths.skills(ID.org),
      answer: ({ params }) => {
        const org = requireOrg(backend.state, params.org)
        return lookup(org.settings.skillsRepository ?? '', skills)
      },
    },
  ]
}
