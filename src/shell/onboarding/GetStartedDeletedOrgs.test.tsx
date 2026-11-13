// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { API_PATHS } from '../../shared/api'
import { byRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
  press,
  waitFor,
} from '../../test-support/mount'
import { Shell } from '../Shell'
import { mountScreen } from '../test-mount'
import { startedApp } from '../test-render'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const { org } = FAKE_IDS

/** The rows of the Deleted orgs list, as text, or null without the list. */
function deletedRows(view: HTMLElement): string[] | null {
  const list = view.querySelector('ul[aria-label="Deleted orgs"]')
  if (!list) return null
  return Array.from(list.children, (row) => String(row.textContent))
}

/** The address `/` in the shell, over a server with these orgs. */
async function openHome(server: FakeApiServer) {
  const app = await startedApp(server)
  const navigation = memoryNavigation(routes.home())
  const view = mountScreen(
    app,
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
  )
  return { app, navigation, view }
}

describe('Get started for a person whose orgs are all deleted', () => {
  test('opens Get started with Create org and the Deleted orgs list, and Restore opens the org', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    const [acme] = coreFixtures().orgs.orgs
    if (!acme) throw new Error('The fixtures have no org.')
    const deletion = {
      deletedAt: FAKE_TIME,
      deletesAt: FAKE_TIME + 604_800_000,
    }
    server.json('GET', API_PATHS.orgs, { orgs: [{ ...acme, deletion }] })
    const { navigation, view } = await openHome(server)
    await waitFor(
      () => navigation.href() === routes.getStarted() && deletedRows(view),
      'Get started with the deleted org',
    )
    const opened = {
      rows: deletedRows(view),
      create: view.textContent?.includes('Create org') === true,
    }
    await press(byRole('button', 'Restore Acme', view))
    await waitFor(
      () => navigation.href() === routes.org(org),
      'the restored org',
    )
    expect({ opened, after: deletedRows(view) }).toEqual({
      opened: {
        rows: ['ACAcmeEverything is deleted on 22 JanuaryRestore'],
        create: true,
      },
      after: null,
    })
  })

  test('shows no Deleted orgs list while no org is deleted', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer()
    server.json('GET', API_PATHS.orgs, { orgs: [] })
    const { navigation, view } = await openHome(server)
    await waitFor(
      () =>
        navigation.href() === routes.getStarted() &&
        view.textContent?.includes('Create org'),
      'Get started without an org',
    )
    expect({
      rows: deletedRows(view),
      title: view.textContent?.includes('Deleted orgs'),
    }).toEqual({ rows: null, title: false })
  })
})
