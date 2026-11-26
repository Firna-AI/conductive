// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { ManualDelay } from '../../app/test-kit'
import { workspacesPath } from '../../shared/workspaces'
import { byRole } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, settle } from '../test-mount'
import { bodiesOf } from '../workspace/kept-test-kit'
import {
  buildsOf,
  buildSucceeds,
  chosen,
  firstBuildRuns,
  menuRows,
  newWorkspace,
  pickerOf,
  shown,
  withDashboard,
  withReadiness,
  type ShownBuilds,
  type Wait,
} from './waiting-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The chosen repositories of Acme, which the org image holds. */
const acme = chosen(['storefront', 'billing-service', 'marketing-site'])

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
    // The repositories reply of a newer Worker says that the org image
    // lacks acme/storefront, while the builds still load.
    const loading = await newWorkspace({
      builds: 'loading',
      repositories: withReadiness(acme, ['storefront']),
    })
    expect({
      page: shown(loading.view),
      rows: menuRows(loading.view),
    }).toEqual({
      page: {
        notices: [],
        spinner: false,
        picker: 'Repository: acme/billing-service',
        send: true,
        note: false,
      },
      rows: [
        {
          name: 'acme/storefront',
          note: notes.waiting,
          off: true,
          checked: false,
        },
        { name: 'acme/billing-service', note: null, off: false, checked: true },
        { name: 'acme/marketing-site', note: null, off: false, checked: false },
      ],
    })
  })

  test('before the first good build, no repository is off and Send stays off, with the notice of the first build once the builds load, and no notice while they load or after they fail', async () => {
    holdAnimationFrames()
    // The repositories reply says that the org has no image yet.
    const beforeImage = withReadiness(acme, [], false)
    const page = async (builds: ShownBuilds) => {
      const { view } = await newWorkspace({ builds, repositories: beforeImage })
      return { page: shown(view), rows: menuRows(view) }
    }
    const on = { note: null, off: false }
    const rows = [
      { name: 'acme/storefront', ...on, checked: true },
      { name: 'acme/billing-service', ...on, checked: false },
      { name: 'acme/marketing-site', ...on, checked: false },
    ]
    const off = {
      picker: 'Repository: acme/storefront',
      send: false,
      note: false,
    }
    const silent = { page: { notices: [], spinner: false, ...off }, rows }
    expect({
      running: await page(firstBuildRuns),
      loading: await page('loading'),
      failed: await page('failed'),
    }).toEqual({
      running: {
        page: {
          notices: [
            "Preparing the cloud computer · 2m&nbsp;14s You can send when it's ready. Cloud computer settings",
          ],
          spinner: true,
          ...off,
        },
        rows,
      },
      loading: silent,
      failed: silent,
    })
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
    await buildSucceeds(server, delay)
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

  test('a written draft with no pick keeps its repository when the build of an earlier repository succeeds, and Send creates the workspace there', async () => {
    holdAnimationFrames()
    const delay = new ManualDelay()
    // acme/storefront comes first in the menu, and it waits for the build.
    const { server, view } = await newWorkspace({
      builds: buildsOf('building', ['storefront']),
      delay,
    })
    const before = shown(view).picker
    await buildSucceeds(server, delay)
    const after = shown(view)
    const storefront = menuRows(view).find(
      (row) => row.name === 'acme/storefront',
    )
    // The picker closes its menu, then Send creates the workspace.
    click(pickerOf(view))
    click(byRole('button', 'Send', view))
    await settle()
    const [sent] = await bodiesOf(
      server,
      'POST',
      workspacesPath(FAKE_IDS.org),
      0,
    )
    expect({ before, after, storefront, sent }).toEqual({
      before: 'Repository: acme/billing-service',
      after: {
        notices: [],
        spinner: false,
        picker: 'Repository: acme/billing-service',
        send: true,
        note: true,
      },
      storefront: {
        name: 'acme/storefront',
        note: null,
        off: false,
        checked: false,
      },
      sent: expect.objectContaining({ repositoryId: 'billing-service' }),
    })
  })
})
