// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { routes } from '../../app/router'
import type { OrgRole } from '../../shared/api'
import { byRole } from '../../test-support/dom-queries'
import { FAKE_IDS } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { buildOf, changed, imageBuilds } from '../settings/test-builds'
import { click } from '../test-mount'
import {
  buildsOf,
  chosen,
  menuRows,
  newWorkspace,
  shown,
  withDashboard,
  type Wait,
} from './waiting-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

describe('the notice of a waiting repository in New workspace', () => {
  test('a kept draft keeps its waiting repository, turns Send off, and says when the repository is ready', async () => {
    holdAnimationFrames()
    const { view } = await newWorkspace({
      builds: buildsOf('building', ['admin-dashboard']),
      repositories: withDashboard,
      draft: 'admin-dashboard',
    })
    expect(shown(view)).toEqual({
      notices: [
        "acme/admin-dashboard is ready after the build You can send when it's ready, or choose another repository. Cloud computer settings",
      ],
      spinner: true,
      picker: 'Repository: acme/admin-dashboard',
      send: false,
      note: false,
    })
  })

  test('with no chosen repository ready, Send is off, an admin gets Cloud computer settings in each state, a refresh shows no build, and a member reads that an admin can act', async () => {
    holdAnimationFrames()
    const only = chosen(['admin-dashboard'])
    const page = async (wait: Wait, role: OrgRole = 'admin') => {
      const opened = await newWorkspace({
        builds: buildsOf(wait, ['admin-dashboard']),
        repositories: only,
        role,
      })
      return { ...opened, page: shown(opened.view) }
    }
    const failed = await page('failed')
    // A refresh never counts as a build that runs, so the notice shows no
    // build for it, and asks for the next build.
    const refreshing = await newWorkspace({
      builds: imageBuilds([buildOf('refresh', 'running', 30_000, 'refresh')], {
        addedRepositories: [changed('admin-dashboard')],
      }),
      repositories: only,
    })
    const off = { send: false, note: false }
    const picker = 'Repository: acme/admin-dashboard'
    expect({
      failed: failed.page,
      member: (await page('failed', 'member')).page,
      waiting: (await page('waiting')).page,
      building: (await page('building')).page,
      refresh: shown(refreshing.view),
    }).toEqual({
      failed: {
        notices: [
          'acme/admin-dashboard is ready after a build succeeds The last build failed. Try it again to send your message. Cloud computer settings',
        ],
        spinner: false,
        picker,
        ...off,
      },
      member: {
        notices: [
          'acme/admin-dashboard is ready after a build succeeds The last build failed. An admin can try it again.',
        ],
        spinner: false,
        picker,
        ...off,
      },
      waiting: {
        notices: [
          'acme/admin-dashboard is ready after the next build Build the computer to send your message. Cloud computer settings',
        ],
        spinner: false,
        picker,
        ...off,
      },
      building: {
        notices: [
          "acme/admin-dashboard is ready after the build You can send when it's ready. Cloud computer settings",
        ],
        spinner: true,
        picker,
        ...off,
      },
      refresh: {
        notices: [
          'acme/admin-dashboard is ready after the next build Build the computer to send your message. Cloud computer settings',
        ],
        spinner: false,
        picker,
        ...off,
      },
    })
    click(byRole('button', 'Cloud computer settings', failed.view))
    expect(failed.navigation.history.at(-1)).toBe(
      routes.settings(FAKE_IDS.org, 'cloud-computer'),
    )
  })

  test('a ready repository with the full name of a waiting repository keeps Send on, with no notice', async () => {
    holdAnimationFrames()
    const only = chosen(['storefront'])
    // GitHub renamed acme/storefront, and a new repository took the name. The
    // org keeps the old name, so two chosen repositories share it, and only
    // the new one waits for its build.
    const twin = only.repositories
      .filter((item) => item.id === 'storefront')
      .map((item) => ({ ...item, id: 'new-storefront', githubId: 100 }))
    const { view } = await newWorkspace({
      builds: buildsOf('building', ['new-storefront']),
      repositories: { repositories: [...only.repositories, ...twin] },
    })
    expect({ page: shown(view), rows: menuRows(view) }).toEqual({
      page: {
        notices: [],
        spinner: false,
        picker: 'Repository: acme/storefront',
        send: true,
        note: true,
      },
      rows: [
        { name: 'acme/storefront', note: null, off: false, checked: true },
        {
          name: 'acme/storefront',
          note: 'Ready after the build',
          off: true,
          checked: false,
        },
      ],
    })
  })
})
