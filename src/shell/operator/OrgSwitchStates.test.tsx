// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { AppModel } from '../../app/app-model'
import { ready } from '../../app/store'
import { testServices } from '../../app/test-kit'
import { operatorOrgPath } from '../../shared/operator'
import { operatorProvidersPath } from '../../shared/operator-providers'
import type { OperatorProviderSwitch } from '../../shared/operator-switch'
import { byRole, queryByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { operatorFixtures } from '../../test-support/fixtures/operator'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { click, mountScreen, settle } from '../test-mount'
import { textOf } from '../test-render'
import { AccountBox } from './AccountBox'
import { boxOf, operatorRequests } from './operator-test-kit'
import {
  ACCOUNT_BOX,
  accountsReply,
  MINUTE,
  openOrgPage,
  QUIET_ORG,
  quietSwitch,
} from './switch-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/**
 * The text of the box of the account of Kestrel Labs with this switch,
 * drawn alone with the configured accounts `boat` and `e2b`. The tests of
 * the page check how the page reads and places the box.
 */
function boxWith(providerSwitch: OperatorProviderSwitch) {
  const kestrel = operatorFixtures().orgs.find((org) => org.id === QUIET_ORG)
  if (!kestrel) throw new Error('The samples have no Kestrel Labs.')
  const app = new AppModel(testServices(new FakeApiServer()))
  const view = mountScreen(
    app,
    <AccountBox
      accounts={ready(accountsReply(['boat', 'e2b']))}
      ask={() => undefined}
      org={{ ...kestrel, providerSwitch }}
      retryAccounts={async () => undefined}
    />,
  )
  return textOf(view.innerHTML)
}

/** The build of Kestrel Labs that its admin started 6 minutes ago, or its refresh. */
function job(kind: 'build' | 'refresh') {
  return {
    id: 'build-1',
    kind,
    startedAt: FAKE_TIME - 6 * MINUTE,
    starter: { githubId: 50400123, login: 'tomas-r' },
  }
}

const head =
  'Provider account Account boat Switch to e2b Started on 15 Jan at 07:48 by @calummoore Switch build'

describe('the Provider account box of the page of an org', () => {
  test('gives the switch that waits for a build, a refresh, Lift, Restore, or an admin, or starts soon, with Stop switch, the switch build that runs with its time, and the failed switch build with its cause and Switch account', () => {
    holdAnimationFrames()
    const waiting = (change: Partial<OperatorProviderSwitch>) =>
      boxWith(quietSwitch({ state: 'waiting', ...change }))
    const started = FAKE_TIME - 20 * MINUTE
    const shown = {
      build: waiting({ waitReason: 'job', waitingJob: job('build') }),
      refresh: waiting({ waitReason: 'job', waitingJob: job('refresh') }),
      lift: waiting({ waitReason: 'suspended' }),
      restore: waiting({ waitReason: 'deleted' }),
      admin: waiting({ waitReason: 'admin' }),
      start: waiting({ waitReason: null }),
      building: boxWith(
        quietSwitch({
          state: 'building',
          buildId: 'switch-build',
          buildStartedAt: FAKE_TIME - (4 * MINUTE + 12_000),
        }),
      ),
      failed: boxWith(
        quietSwitch({
          state: 'failed',
          buildStartedAt: started,
          buildCompletedAt: started + 10 * MINUTE + 4_000,
          failure: 'provider',
        }),
      ),
    }
    expect(shown).toEqual({
      build: `${head} Waits for the build of @tomas-r That build started 6 minutes ago. The switch build starts when it ends. Stop switch`,
      refresh: `${head} Waits for a refresh That refresh started 6 minutes ago. The switch build starts when it ends. Stop switch`,
      lift: `${head} Waits for Lift No build runs while Kestrel Labs is suspended. Lift starts the switch build. Stop switch`,
      restore: `${head} Waits for Restore No build runs while Kestrel Labs is deleted. Restore starts the switch build. Stop switch`,
      admin: `${head} Waits for an admin The switch build runs for an admin who is not suspended. It starts when Kestrel Labs has one. Stop switch`,
      start: `${head} Starts soon The app starts the switch build on its own. Stop switch`,
      building: `${head} Building · 4m 12s New workspaces start on boat until this build succeeds. Each build has a 60-minute limit. Stop switch`,
      failed: `${head} Failed after 10m 04s The build got errors from e2b. Kestrel Labs stays on boat, and new workspaces still start there. Switch account`,
    })
  })

  test('after a switch, gives the last switch with the time when the account changed, and the workspaces on each account', async () => {
    const { box } = await openOrgPage(QUIET_ORG, {
      change: (org) => ({
        ...org,
        providerAccount: 'e2b',
        lastProviderSwitch: quietSwitch({
          state: 'completed',
          accountChangedAt: FAKE_TIME - 2 * 24 * 60 * MINUTE,
        }),
        workspacesByAccount: [
          { id: 'boat', workspaces: 210 },
          { id: 'e2b', workspaces: 2 },
        ],
      }),
    })
    expect(box()).toBe(
      'Provider account Account e2b Last switch From boat on 13 Jan at 08:00 by @calummoore Workspaces by account boat 210 e2b 2 Switch account',
    )
  })

  test('with no other configured account, gives a line in place of Switch account', async () => {
    const { box } = await openOrgPage(QUIET_ORG, { accounts: ['boat'] })
    expect(box()).toBe(
      'Provider account Account boat boat is the only configured account.',
    )
  })

  test('a reply without the switch fields, from an older Worker, gives the account and offers no switch', async () => {
    const { box } = await openOrgPage(QUIET_ORG, {
      change: (org) => ({
        id: org.id,
        providerAccount: org.providerAccount,
        name: org.name,
        initials: org.initials,
        createdAt: org.createdAt,
        repositories: org.repositories,
        workspaceStates: org.workspaceStates,
        running: org.running,
        members: org.members,
        suspension: org.suspension,
        deletion: org.deletion,
      }),
    })
    expect(box()).toBe('Provider account Account boat')
  })

  test('an unavailable or missing activation keeps the account box and offers no switch or question', async () => {
    for (const switchAvailable of [false, undefined]) {
      const { view, box } = await openOrgPage(QUIET_ORG, {
        change: (org) => ({ ...org, switchAvailable }),
      })
      expect(box()).toBe('Provider account Account boat')
      expect(queryByRole('button', 'Switch account', view)).toBeNull()
      expect(queryByRole('dialog', 'Switch Kestrel Labs to e2b?')).toBeNull()
    }
  })

  test('accounts that did not load show their failure with Try again in the box, and Try again reads them again', async () => {
    const { server, view, box } = await openOrgPage(QUIET_ORG, {
      accounts: 'failed',
    })
    const failed = box()
    server.json('GET', operatorProvidersPath(), accountsReply(['boat', 'e2b']))
    const account = boxOf(view, ACCOUNT_BOX)
    if (!account) throw new Error('The page has no box of the account.')
    click(byRole('button', 'Try again', account))
    await settle()
    expect({
      failed,
      retried: box(),
      requests: await operatorRequests(server),
    }).toEqual({
      failed:
        "Provider account Account boat The provider accounts didn't load The request failed. Try again",
      retried: 'Provider account Account boat Switch account',
      requests: [
        `GET ${operatorOrgPath(QUIET_ORG)}`,
        `GET ${operatorProvidersPath()}`,
        `GET ${operatorProvidersPath()}`,
      ],
    })
  })
})
