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
import { click } from '../test-mount'
import {
  buildsOf,
  chosen,
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
        "acme/admin-dashboard is ready after the build You can send when it's ready, or choose another repository.",
      ],
      spinner: true,
      picker: 'Repository: acme/admin-dashboard',
      send: false,
      note: false,
    })
  })

  test('with no chosen repository ready, Send is off, an admin gets Open Cloud computer unless a build runs, and a member reads that an admin can act', async () => {
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
    const off = { send: false, note: false }
    const picker = 'Repository: acme/admin-dashboard'
    expect({
      failed: failed.page,
      member: (await page('failed', 'member')).page,
      waiting: (await page('waiting')).page,
      building: (await page('building')).page,
    }).toEqual({
      failed: {
        notices: [
          'acme/admin-dashboard is ready after a build succeeds The last build failed. Try it again to send your message. Open Cloud computer',
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
          'acme/admin-dashboard is ready after the next build Build the computer to send your message. Open Cloud computer',
        ],
        spinner: false,
        picker,
        ...off,
      },
      building: {
        notices: [
          "acme/admin-dashboard is ready after the build You can send when it's ready.",
        ],
        spinner: true,
        picker,
        ...off,
      },
    })
    click(byRole('button', 'Open Cloud computer', failed.view))
    expect(failed.navigation.history.at(-1)).toBe(
      routes.settings(FAKE_IDS.org, 'cloud-computer'),
    )
  })
})
