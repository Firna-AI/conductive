import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import type {
  BuildLogEvent,
  ImageBuild,
  OrgSettings,
  Repository,
} from '../shared/org-settings'
import { BuildCard } from './BuildCard'
import { check } from './markupCheck'
import { MemberComputerView } from './MemberComputerView'
import { OrgRepositoryList } from './MemberRepositoriesTab'

const now = Date.UTC(2026, 10, 5, 18)

function build(
  id: string,
  completedAt: number,
  seconds: number,
  state: ImageBuild['state'],
): ImageBuild {
  return {
    id,
    orgId: 'acme',
    kind: 'build',
    state,
    startedAt: completedAt - seconds * 1000,
    completedAt,
    durationMs: seconds * 1000,
    error: null,
  }
}

function running(id: string, seconds: number): ImageBuild {
  return {
    ...build(id, now, seconds, 'running'),
    completedAt: null,
    durationMs: null,
  }
}

/** A refresh, which only fetches commits and runs no install script. */
function refresh(source: ImageBuild): ImageBuild {
  return { ...source, kind: 'refresh' }
}

describe('the read-only settings of a member', () => {
  it('list_only_the_repositories_that_the_org_chose', () => {
    const repository = (fullName: string, selected: boolean): Repository => ({
      id: fullName,
      orgId: 'acme',
      githubId: 1,
      fullName,
      description: '',
      defaultBranch: 'main',
      installationId: 1,
      selected,
    })
    const repositories = [
      repository('acme/storefront', true),
      repository('acme/admin-dashboard', false),
      repository('acme/billing-service', true),
    ]
    expect(
      check(
        <OrgRepositoryList repositories={repositories} />,
        ['acme/storefront', 'acme/billing-service'],
        ['acme/admin-dashboard'],
      ),
    ).toEqual({ missing: [], unwanted: [] })
  })

  it('show_the_builds_with_the_times_and_lengths_of_the_mockup', () => {
    const history = [
      build('b4', now - 8 * 3_600_000, 401, 'succeeded'),
      build('b3', Date.UTC(2026, 10, 4, 9), 362, 'succeeded'),
      build('b2', Date.UTC(2026, 10, 3, 15), 138, 'failed'),
      build('b1', Date.UTC(2026, 9, 28, 12), 433, 'succeeded'),
    ]
    const card = (builds: ImageBuild[], currentImageBuildId = 'b4') => (
      <BuildCard
        builds={{ builds, currentImageBuildId }}
        log={[]}
        now={now}
        timeZone="UTC"
      />
    )
    expect(
      check(
        card(history),
        [
          'Last build 8 hours ago Succeeded in 6m 41s',
          'History (4)',
          'Yesterday Succeeded in 6m 02s',
          '3 Nov Failed after 2m 18s',
          '28 Oct Succeeded in 7m 13s',
        ],
        ['Building'],
      ),
    ).toEqual({ missing: [], unwanted: [] })
    expect(
      check(
        card([running('b5', 134), ...history]),
        [
          'Building · 2m 14s',
          'Workspaces start from the build of 8 hours ago until this one finishes.',
        ],
        ['Last build'],
      ),
    ).toEqual({ missing: [], unwanted: [] })
    // A newer refresh is no build: the head and the history skip it.
    expect(
      check(
        card([refresh(running('r1', 30)), ...history]),
        ['Last build 8 hours ago Succeeded in 6m 41s', 'History (4)'],
        ['Building', 'History (5)'],
      ),
    ).toEqual({ missing: [], unwanted: [] })
    // Workspaces start from the current image, also when a refresh made it.
    const refreshed = refresh(build('r2', now - 3_600_000, 30, 'succeeded'))
    expect(
      check(
        card([running('b5', 134), refreshed, ...history], 'r2'),
        [
          'Building · 2m 14s',
          'Workspaces start from the build of 1 hour ago until this one finishes.',
        ],
        ['Workspaces can start when this build finishes.'],
      ),
    ).toEqual({ missing: [], unwanted: [] })
  })

  it('show_the_newest_build_and_its_log_from_their_props', () => {
    const settings: OrgSettings = {
      installScript: 'npm ci',
      startupScript: '',
      envVars: [{ name: 'DATABASE_URL', secret: true }],
      updatedAt: 0,
      needsBuild: true,
    }
    const event = (eventNumber: number, text: string): BuildLogEvent => ({
      eventNumber,
      occurredAt: now,
      text: `${text}\n`,
    })
    const done = build('b1', now - 8 * 3_600_000, 401, 'succeeded')
    const view = (
      builds: ImageBuild[],
      log: BuildLogEvent[] | null,
      shown: OrgSettings = settings,
    ) => (
      <MemberComputerView
        builds={{ builds, currentImageBuildId: 'b1' }}
        log={log}
        now={now}
        org={{ id: 'acme', name: 'Acme', role: 'member' }}
        settings={shown}
        timeZone="UTC"
        viewport="desktop"
      />
    )
    const log = [
      event(1, 'Cloning 3 repositories'),
      event(2, 'added 1184 packages'),
    ]
    const cases: {
      name: string
      element: ReactElement
      present: string[]
      absent: string[]
    }[] = [
      {
        name: 'running build',
        element: view([running('b2', 134), done], log),
        present: [
          'The shared cloud computer of Acme.',
          'Building · 2m 14s',
          'Cloning 3 repositories',
          'added 1184 packages',
          'The install script changed',
          'DATABASE_URL',
        ],
        // These settings name no base image, so the tab names no software.
        absent: ['The log of this build did not load.', 'Cloud computers run'],
      },
      {
        name: 'base image of the settings',
        element: view([done], [], {
          ...settings,
          baseImage: {
            operatingSystem: 'Ubuntu 26.04',
            software: ['Node.js 26', 'uv'],
          },
        }),
        present: [
          'Cloud computers run Ubuntu 26.04 and include Node.js 26 and uv. The install script runs only at a build of the computer.',
        ],
        absent: ['Ubuntu 24.04'],
      },
      {
        name: 'log that did not load',
        element: view([running('b2', 134), done], null),
        present: ['The log of this build did not load.'],
        absent: ['Cloning 3 repositories'],
      },
      {
        name: 'finished build',
        element: view([{ ...build('b2', now, 134, 'succeeded') }, done], log),
        present: ['Last build Just now Succeeded in 2m 14s', 'History (2)'],
        absent: ['Building', 'Cloning 3 repositories'],
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
