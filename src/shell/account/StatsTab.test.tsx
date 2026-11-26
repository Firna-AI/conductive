// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { AppModel } from '../../app/app-model'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { HeldRequests, testServices } from '../../app/test-kit'
import { ACCOUNT_PATHS, type AccountStats } from '../../shared/account'
import {
  byRole,
  queryByRole,
  queryByText,
} from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { coreFixtures, FAKE_TIME } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { settingsGroup, settingsTab } from '../settings/settings-test-kit'
import { Shell } from '../Shell'
import { click, mountScreen, settle } from '../test-mount'
import { textOf } from '../test-render'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const DAY = 24 * 60 * 60 * 1_000

/** 30 UTC days through the fake time, with `count` on each day. */
function days(count: (index: number) => number) {
  return Array.from({ length: 30 }, (_, index) => ({
    date: new Date(FAKE_TIME - (29 - index) * DAY).toISOString().slice(0, 10),
    count: count(index),
  }))
}

const stats: AccountStats = {
  readAt: FAKE_TIME,
  orgs: 2,
  workspaces: { total: 1240, lastWeek: 7 },
  // As the Worker does, the reply counts the 1,200 removed workspaces in
  // `archived` too, and the tab takes them out of Archived.
  workspaceStates: {
    running: 3,
    stopped: 11,
    failed: 1,
    archived: 1225,
    removed: 1200,
  },
  automations: 4,
  newWorkspacesByDay: days((index) => index % 3),
  automationRunsByDay: days(() => 2),
}

/** The shell at the Stats tab of the account, with the fake API. */
async function mountStats(server: FakeApiServer, held?: HeldRequests) {
  holdAnimationFrames()
  server.json('GET', ACCOUNT_PATHS.account, coreFixtures().account)
  const navigation = memoryNavigation(routes.accountTab('stats'))
  const view = mountScreen(
    new AppModel(
      testServices(server, held ? { fetch: held.fetch } : undefined),
    ),
    <NavigationContext.Provider value={navigation}>
      <Shell />
    </NavigationContext.Provider>,
  )
  await settle()
  const tab = () => textOf(settingsTab('Stats').innerHTML)
  return { view, tab }
}

/** The requests of the Stats tab that reached the fake API. */
function statsReads(server: FakeApiServer): number {
  return server.requests.filter(
    (request) => new URL(request.url).pathname === ACCOUNT_PATHS.stats,
  ).length
}

describe('the Stats tab of the account', () => {
  test('follows Keyboard shortcuts, and shows the totals, the workspaces by state with Removed apart from Archived, and the 30-day totals', async () => {
    const server = new FakeApiServer()
    server.json('GET', ACCOUNT_PATHS.stats, stats)
    await mountStats(server)
    expect({
      account: settingsGroup('Account'),
      totals: textOf(byRole('region', 'Totals').innerHTML),
      states: textOf(byRole('list', 'Workspaces by state').innerHTML),
      workspaceDays:
        queryByText('30 in the last 30 days, by UTC day.') !== null,
      runDays: queryByText('60 in the last 30 days, by UTC day.') !== null,
      reads: statsReads(server),
    }).toEqual({
      account: {
        rows: [
          'General',
          'Agents',
          'Preferences',
          'Keyboard shortcuts',
          'Stats',
        ],
        open: ['Stats'],
      },
      totals:
        'Workspaces 1,240 +7 in 7 days Running now 3 Automations 4 Orgs 2',
      states:
        'Running 3 0.2% Stopped 11 0.9% Failed 1 0.1% Archived 25 2% Removed 1,200 97%',
      workspaceDays: true,
      runDays: true,
      reads: 1,
    })
  })

  test('keeps the boxes in place while the numbers load, shows only a notice when they fail, and Try again reads them again', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    held.hold('GET', ACCOUNT_PATHS.stats)
    const { tab } = await mountStats(server, held)
    const loading = tab()
    server.json(
      'GET',
      ACCOUNT_PATHS.stats,
      { error: { code: 'internal_error', message: 'The request failed.' } },
      500,
    )
    held.release('GET', ACCOUNT_PATHS.stats)
    await settle()
    const failed = tab()
    server.json('GET', ACCOUNT_PATHS.stats, stats)
    click(byRole('button', 'Try again'))
    await settle()
    expect({
      loading,
      failed,
      retried: queryByRole('region', 'Totals') !== null,
      reads: statsReads(server),
    }).toEqual({
      loading: 'Workspaces New workspaces Automation runs',
      failed: 'Your stats could not load Try again',
      retried: true,
      reads: 2,
    })
  })
})
