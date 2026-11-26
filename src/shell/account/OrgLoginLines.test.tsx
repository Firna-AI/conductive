// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { AppModel } from '../../app/app-model'
import { accountWithDefaults } from '../../app/default-logins.test-support'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { testServices } from '../../app/test-kit'
import { ACCOUNT_PATHS } from '../../shared/account'
import { GET_STARTED_PATH } from '../../shared/onboarding'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, fakeUser } from '../../test-support/fixtures/core'
import {
  holdAnimationFrames,
  MOUNTED_TEST_TIMEOUT,
} from '../../test-support/mount'
import { Shell } from '../Shell'
import { mountScreen, settle } from '../test-mount'
import { startedApp, textOf } from '../test-render'
import { AccountTabContent } from './AccountTabContent'
import { listItems } from './test-markup'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const line = "Your new sessions in Acme use Acme's login."

describe('the org login of an agent on the account and in Get started', () => {
  test('the account names under an agent each org whose org login the new sessions take, also beside an own login, and names none under an agent on the own login', async () => {
    holdAnimationFrames()
    const rows = []
    for (const ownLogins of [false, true]) {
      const server = new FakeApiServer()
      server.json(
        'GET',
        ACCOUNT_PATHS.account,
        accountWithDefaults(
          'admin',
          { claude: 'org', codex: ownLogins ? 'own' : null },
          { ownLogins },
        ),
      )
      const app = await startedApp(server)
      const view = mountScreen(
        app,
        <AccountTabContent connect={null} tab="agents" user={fakeUser} />,
      )
      await settle()
      rows.push(listItems(view.innerHTML, 'Agents').map(textOf))
    }
    expect(rows).toEqual([
      [`Claude Connect ${line}`, 'Codex Connect'],
      [
        `Claude Connected Subscription token Remove ${line} Let other members use this login Their messages in your sessions start a new session.`,
        'Codex Connected API key Remove Let other members use this login Their messages in your sessions use this login.',
      ],
    ])
  })

  test('the agent step of a member with only an org login is Ready, names the org login, and opens no form', async () => {
    holdAnimationFrames()
    const server = new FakeApiServer({ role: 'member' })
    server.json('GET', GET_STARTED_PATH, {
      orgId: FAKE_IDS.org,
      steps: [
        { step: 'github-app', complete: false },
        { step: 'org', complete: true },
        { step: 'agent-login', complete: false },
      ],
    })
    server.json(
      'GET',
      ACCOUNT_PATHS.account,
      accountWithDefaults('member', { claude: 'org', codex: null }),
    )
    const app = new AppModel(testServices(server))
    const view = mountScreen(
      app,
      <NavigationContext.Provider value={memoryNavigation(routes.getStarted())}>
        <Shell />
      </NavigationContext.Provider>,
    )
    await settle()
    const step = Array.from(view.querySelectorAll('h2'))
      .find((title) => title.textContent === '3. Connect Claude or Codex')
      ?.closest('section')
    expect({
      step: textOf(step?.innerHTML ?? ''),
      form: step?.querySelector('input[type="password"]') ?? null,
    }).toEqual({
      step: `3. Connect Claude or Codex Ready You can start now with Acme's login. Connect your own at any time in your account. Claude Connect ${line} Codex Connect`,
      form: null,
    })
  })
})
