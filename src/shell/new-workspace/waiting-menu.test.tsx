// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { ManualDelay } from '../../app/test-kit'
import {
  orgSettingsPaths,
  type BuildsResponse,
} from '../../shared/org-settings'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { goodBuild, imageBuilds } from '../settings/test-builds'
import { settle } from '../test-mount'
import {
  buildsOf,
  menuRows,
  newest,
  newWorkspace,
  shown,
  withDashboard,
  type Wait,
} from './waiting-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('the repository menu of New workspace', () => {
  test('shows a waiting repository off in its place, with the note of its build, and the form picks the first ready repository', async () => {
    holdAnimationFrames()
    const notes: Record<Wait, string> = {
      building: 'Ready after the build',
      failed: 'Ready after a build succeeds',
      waiting: 'Ready after the next build',
    }
    for (const wait of ['building', 'failed', 'waiting'] as const) {
      const { view } = await newWorkspace({
        builds: buildsOf(wait, ['storefront']),
      })
      expect({ wait, page: shown(view), rows: menuRows(view) }).toEqual({
        wait,
        page: {
          notices: [],
          spinner: false,
          picker: 'Repository: acme/billing-service',
          send: true,
          note: true,
        },
        rows: [
          {
            name: 'acme/storefront',
            note: notes[wait],
            off: true,
            checked: false,
          },
          {
            name: 'acme/billing-service',
            note: null,
            off: false,
            checked: true,
          },
          {
            name: 'acme/marketing-site',
            note: null,
            off: false,
            checked: false,
          },
        ],
      })
    }
  })

  test('a waiting repository turns on when the build that holds it succeeds', async () => {
    holdAnimationFrames()
    const delay = new ManualDelay()
    const { server, view } = await newWorkspace({
      builds: buildsOf('building', ['admin-dashboard']),
      repositories: withDashboard,
      draft: 'admin-dashboard',
      delay,
    })
    const before = shown(view).send
    // The build ends with success, and the org image holds the repository.
    const built = { ...newest.building, state: 'succeeded' as const }
    server.json('GET', orgSettingsPaths.builds(FAKE_IDS.org), {
      ...imageBuilds([]),
      builds: [built, goodBuild],
      currentImageBuildId: built.id,
    } satisfies BuildsResponse)
    // The builds read again on their timer while a build runs.
    await delay.runAll()
    await settle()
    expect({
      before,
      after: shown(view),
      row: menuRows(view).find((row) => row.name === 'acme/admin-dashboard'),
    }).toEqual({
      before: false,
      after: {
        notices: [],
        spinner: false,
        picker: 'Repository: acme/admin-dashboard',
        send: true,
        note: true,
      },
      row: {
        name: 'acme/admin-dashboard',
        note: null,
        off: false,
        checked: true,
      },
    })
  })
})
