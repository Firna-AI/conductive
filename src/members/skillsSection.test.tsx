import { describe, expect, it } from 'vitest'
import type {
  OrgSettings,
  SkillsRepositoryLookupResponse,
} from '../shared/org-settings'
import { check } from './markupCheck'
import { MemberComputerView } from './MemberComputerView'

const now = Date.UTC(2026, 10, 17, 12)
const on =
  "Claude can run automatic commands from this repository's skills, including future updates, with the workspace's access."
const off =
  "Claude runs no automatic commands from any skill or custom slash command, including the workspace's own. Agents can still choose to run commands that a skill suggests."
/** The note of the saved choice, then the link to the guide. */
const note =
  'Running cloud computers keep their current trust until their next start or resume. How trust works'
/** The markup of the link to the guide, which opens in a new tab. */
const guide =
  'href="https://conductive.build/docs/cloud-computer#trust-a-skills-repository" rel="noreferrer" target="_blank"'
/** The markup of a section without the switch of an admin. */
const noSwitch = ['role="switch"', 'Trust this skills repository']

/** The settings of Acme with this saved skills repository and trusted name. */
function settings(
  skillsRepository: string,
  trustedSkillsRepository: string,
): OrgSettings {
  return {
    installScript: '',
    startupScript: '',
    skillsRepository,
    trustedSkillsRepository,
    envVars: [],
    updatedAt: 0,
  }
}

/**
 * The tab of a person who may not change the settings. `trusted` is the
 * saved trusted repository, empty as each repository starts.
 */
function tab(
  repository: string,
  notice: SkillsRepositoryLookupResponse['notice'],
  suspended: boolean,
  trusted = '',
) {
  return (
    <MemberComputerView
      builds={{
        builds: [],
        currentImageBuildId: null,
        changes: {
          installScript: false,
          addedRepositories: [],
          removedRepositories: [],
        },
      }}
      log={[]}
      now={now}
      onRetrySkills={() => undefined}
      org={{ id: 'acme', name: 'Acme', role: suspended ? 'admin' : 'member' }}
      settings={settings(repository, trusted)}
      skills={{
        status: 'ready',
        value: { repository, skills: [], notice, clashes: [] },
      }}
      suspended={suspended}
      timeZone="UTC"
      viewport="desktop"
    />
  )
}

describe('the read-only Skills section', () => {
  it('names_an_admin_for_a_member_and_no_action_in_a_suspended_org_and_shows_the_saved_trust_without_a_switch', () => {
    const cases = [
      {
        name: 'member without a repository',
        element: tab('', null, false),
        present: ['Skills', 'An admin can choose one.'],
        absent: ['No repository chosen.', 'Repository'],
      },
      {
        name: 'suspended org without a repository',
        element: tab('', null, true),
        present: ['No repository chosen.'],
        absent: ['An admin can'],
      },
      {
        name: 'member with a private repository',
        element: tab('acme/agent-skills', 'private', false),
        present: [
          `Repository acme/agent-skills Trust Not trusted ${off} ${note} acme/agent-skills is private Agents get no skills from it. An admin can choose a public repository.`,
        ],
        absent: ['Choose a public repository, then save.'],
      },
      {
        name: 'suspended org with a private repository',
        element: tab('acme/agent-skills', 'private', true),
        present: ['acme/agent-skills is private Agents get no skills from it.'],
        absent: ['An admin can', 'Choose a public repository'],
      },
      {
        name: 'member with a repository that is not found',
        element: tab('acme/agent-skils', 'not-found', false),
        present: [
          'acme/agent-skils was not found GitHub has no public repository with this name. An admin can check the name.',
        ],
        absent: ['Check the name, then save.'],
      },
      {
        name: 'suspended org with a repository that is not found',
        element: tab('acme/agent-skils', 'not-found', true),
        present: [
          'acme/agent-skils was not found GitHub has no public repository with this name.',
        ],
        absent: ['An admin can', 'Check the name'],
      },
      {
        name: 'member with a repository that its saved name trusts',
        element: tab('Acme/Agent-Skills', null, false, 'acme/agent-skills'),
        present: [
          `Repository Acme/Agent-Skills Trust Trusted ${on} ${note}`,
          guide,
        ],
        absent: [...noSwitch, off],
      },
      {
        name: 'suspended org with a trusted name of another repository',
        element: tab('acme/agent-skills', null, true, 'acme/old-skills'),
        present: [`Repository acme/agent-skills Trust Not trusted ${off}`],
        absent: [...noSwitch, 'Trusted'],
      },
      {
        name: 'member with saved text that names no repository',
        element: tab('agent-skills', 'not-found', false),
        present: ['Repository agent-skills agent-skills was not found'],
        absent: ['Trusted', 'Not trusted', 'How trust works'],
      },
    ]
    for (const item of cases) {
      expect({
        case: item.name,
        ...check(item.element, item.present, item.absent),
      }).toEqual({ case: item.name, missing: [], unwanted: [] })
    }
  })
})
