import { describe, expect, it } from 'vitest'
import type {
  BuildsResponse,
  ImageBuild,
  OrgSettings,
} from '../shared/org-settings'
import { check } from './markupCheck'
import { MemberComputerView } from './MemberComputerView'

const now = Date.UTC(2026, 10, 9, 12)

/** An admin saved the install script after the newest build started. */
const settings: OrgSettings = {
  installScript: 'npm ci',
  startupScript: '',
  envVars: [],
  updatedAt: 0,
  needsBuild: true,
}

function build(id: string, state: ImageBuild['state']): ImageBuild {
  const ended = state !== 'running'
  return {
    id,
    orgId: 'firna',
    kind: 'build',
    state,
    startedAt: now - 134_000,
    completedAt: ended ? now : null,
    durationMs: ended ? 134_000 : null,
    error: null,
  }
}

function view(builds: BuildsResponse) {
  return (
    <MemberComputerView
      builds={builds}
      log={[]}
      now={now}
      org={{ id: 'firna', name: 'Firna', role: 'member' }}
      settings={settings}
      timeZone="UTC"
      viewport="desktop"
    />
  )
}

const oneMoreBuild = 'One more build runs it when this build succeeds.'
const keepsBuild = 'Workspaces keep the current build until then.'

describe('the notice of a changed install script for a member', () => {
  it('names_the_build_that_runs_the_script_and_never_offers_a_build', () => {
    const cases = [
      {
        name: 'first build runs',
        builds: {
          builds: [build('b1', 'running')],
          currentImageBuildId: null,
          changes: {
            installScript: true,
            addedRepositories: [],
            removedRepositories: [],
          },
        },
        present: [`The install script changed ${oneMoreBuild}`],
        absent: [keepsBuild, 'Build computer'],
      },
      {
        name: 'no good build, and none runs',
        builds: {
          builds: [build('b1', 'failed')],
          currentImageBuildId: null,
          changes: {
            installScript: true,
            addedRepositories: [],
            removedRepositories: [],
          },
        },
        present: ['The install script changed It runs at the next build.'],
        absent: [keepsBuild, oneMoreBuild, 'Build computer'],
      },
      {
        name: 'good build',
        builds: {
          builds: [build('b1', 'succeeded')],
          currentImageBuildId: 'b1',
          changes: {
            installScript: true,
            addedRepositories: [],
            removedRepositories: [],
          },
        },
        present: [`It runs at the next build. ${keepsBuild}`],
        absent: [oneMoreBuild, 'Build computer'],
      },
    ]
    for (const item of cases) {
      expect({
        case: item.name,
        ...check(view(item.builds), item.present, item.absent),
      }).toEqual({ case: item.name, missing: [], unwanted: [] })
    }
  })
})
