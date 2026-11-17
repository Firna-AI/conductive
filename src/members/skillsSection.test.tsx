import { describe, expect, it } from 'vitest'
import type {
  OrgSettings,
  SkillsRepositoryLookupResponse,
} from '../shared/org-settings'
import { check } from './markupCheck'
import { MemberComputerView } from './MemberComputerView'

const now = Date.UTC(2026, 10, 17, 12)

/** The settings of Acme with this saved skills repository. */
function settings(skillsRepository: string): OrgSettings {
  return {
    installScript: '',
    startupScript: '',
    skillsRepository,
    envVars: [],
    updatedAt: 0,
  }
}

/** The tab of a person who may not change the settings. */
function tab(
  repository: string,
  notice: SkillsRepositoryLookupResponse['notice'],
  suspended: boolean,
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
      settings={settings(repository)}
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
  it('names_an_admin_for_a_member_and_no_action_in_a_suspended_org', () => {
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
          'Repository acme/agent-skills acme/agent-skills is private Agents get no skills from it. An admin can choose a public repository.',
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
    ]
    for (const item of cases) {
      expect({
        case: item.name,
        ...check(item.element, item.present, item.absent),
      }).toEqual({ case: item.name, missing: [], unwanted: [] })
    }
  })
})
