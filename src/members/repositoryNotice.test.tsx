import { describe, expect, it } from 'vitest'
import type {
  BuildsResponse,
  ImageBuild,
  OrgSettings,
} from '../shared/org-settings'
import { FakeApiServer } from '../test-support/fake-api'
import { createMembersApi } from './api/client'
import { check } from './markupCheck'
import { MemberComputerView } from './MemberComputerView'
import { MemberRepositoriesTab } from './MemberRepositoriesTab'
import noticeStyles from './ui/Notice.module.css'

const now = Date.UTC(2026, 10, 10, 12)

const settings: OrgSettings = {
  installScript: 'npm ci',
  startupScript: '',
  envVars: [],
  updatedAt: 0,
  needsBuild: false,
}

function build(
  id: string,
  state: ImageBuild['state'],
  ago: number,
): ImageBuild {
  const ended = state !== 'running'
  return {
    id,
    orgId: 'acme',
    kind: 'build',
    state,
    startedAt: now - ago,
    completedAt: ended ? now - ago + 60_000 : null,
    durationMs: ended ? 60_000 : null,
    error: null,
  }
}

const good = build('good', 'succeeded', 3_600_000)
const dashboard = { id: 'admin-dashboard', fullName: 'acme/admin-dashboard' }
const marketing = { id: 'marketing-site', fullName: 'acme/marketing-site' }

/** The builds of Acme after its good build, with the changes it lacks. */
function builds(
  newer: readonly ImageBuild[],
  changes: Partial<BuildsResponse['changes']>,
): BuildsResponse {
  return {
    builds: [...newer, good],
    currentImageBuildId: good.id,
    changes: {
      installScript: false,
      addedRepositories: [],
      removedRepositories: [],
      ...changes,
    },
  }
}

const org = { id: 'acme', name: 'Acme', role: 'member' } as const
const intro = 'every repository of the org. Only an admin can change it.'

function computer(shown: BuildsResponse, suspended = false) {
  return (
    <MemberComputerView
      builds={shown}
      log={[]}
      now={now}
      org={org}
      settings={settings}
      suspended={suspended}
      timeZone="UTC"
      viewport="desktop"
    />
  )
}

describe('the repository notice of a member', () => {
  it('shows_under_the_intro_of_the_cloud_computer_tab_without_a_button_and_keeps_the_history_closed', () => {
    const failed = builds([build('add', 'failed', 600_000)], {
      addedRepositories: [dashboard],
    })
    const cases = [
      {
        name: 'failed build',
        element: computer(failed),
        present: [
          `${intro} acme/admin-dashboard is ready after a build succeeds The last build failed. An admin can try it again.`,
        ],
        absent: ['Try again', 'Build computer', noticeStyles.busy, 'open=""'],
      },
      {
        name: 'build runs',
        element: computer(
          builds([build('add', 'running', 60_000)], {
            addedRepositories: [dashboard],
          }),
        ),
        present: [
          `${intro} acme/admin-dashboard is ready after the build`,
          noticeStyles.busy,
        ],
        absent: ['An admin can', 'open=""'],
      },
      {
        name: 'removal waits',
        element: computer(builds([], { removedRepositories: [marketing] })),
        present: [
          `${intro} acme/marketing-site leaves at the next build An admin can start the build.`,
        ],
        absent: ['Build computer', 'open=""'],
      },
      {
        name: 'suspended org',
        element: computer(failed, true),
        present: [
          'acme/admin-dashboard is ready after a build succeeds The last build failed.',
        ],
        absent: ['An admin can'],
      },
      {
        name: 'no change',
        element: computer(builds([], {})),
        present: ['open=""'],
        absent: ['is ready after', 'leaves at'],
      },
    ]
    for (const item of cases) {
      expect({
        case: item.name,
        ...check(item.element, item.present, item.absent),
      }).toEqual({ case: item.name, missing: [], unwanted: [] })
    }
  })

  it('shows_above_the_list_of_the_read_only_repositories_tab', () => {
    const api = createMembersApi(new FakeApiServer().fetch)
    const tab = (shown?: BuildsResponse) => (
      <MemberRepositoriesTab
        api={api}
        builds={shown}
        org={org}
        viewport="desktop"
      />
    )
    const removal = builds([], { removedRepositories: [marketing] })
    expect({
      removal: check(
        tab(removal),
        [
          'Only an admin can change them. acme/marketing-site leaves at the next build An admin can start the build.',
        ],
        ['Build computer'],
      ),
      loading: check(tab(), [], ['leaves at']),
    }).toEqual({
      removal: { missing: [], unwanted: [] },
      loading: { missing: [], unwanted: [] },
    })
  })
})
