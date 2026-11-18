// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import {
  accountWithDefaults,
  orgListWithout,
} from '../app/default-logins.test-support'
import { routes } from '../app/router'
import { ACCOUNT_PATHS, type AccountResponse } from '../shared/account'
import { byRole } from '../test-support/dom-queries'
import { FakeApiServer } from '../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../test-support/mount'
import { openApp } from './automations/automation-test-kit'
import { click, press, settle } from './test-mount'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

/** The labels of the models of the fake, which are also their IDs. */
const labels = coreFixtures().models.models.map((model) => model.label)

/**
 * The fake API, where the person runs Claude on an own endpoint whose last
 * model list did not name Opus 5.5, the default model, or Sonnet 5.5.
 */
function serverWithList(): FakeApiServer {
  const server = new FakeApiServer()
  const account = coreFixtures().account
  server.json('GET', ACCOUNT_PATHS.account, {
    ...account,
    agentLogins: account.agentLogins.map((login) =>
      login.agent === 'claude'
        ? {
            agent: 'claude',
            connected: true,
            kind: 'endpoint',
            host: 'proxy.example.com',
            modelList: {
              missing: ['Opus 5.5', 'Sonnet 5.5'],
              checkedAt: FAKE_TIME,
            },
            noReuse: false,
            updatedAt: FAKE_TIME,
          }
        : login,
    ),
  } satisfies AccountResponse)
  return server
}

/**
 * The models that the picker of the preferences, of New workspace, and of a
 * new automation offer, in the app over `server`.
 */
async function pickerModels(server: FakeApiServer) {
  const { navigation, view } = await openApp(
    server,
    routes.accountTab('preferences'),
  )
  /** The models that the picker of the page at `address` offers. */
  const offered = async (address: string) => {
    act(() => navigation.push(address))
    await settle()
    click(byRole('button', 'Model and effort: Opus 5.5, High', view))
    const menu = byRole('menu', 'Model and effort')
    const shown = Array.from(
      menu.querySelectorAll('[role="menuitemradio"]'),
    ).flatMap((item) =>
      labels.filter((label) => item.textContent?.startsWith(label)),
    )
    press(menu, 'Escape')
    await settle()
    return shown
  }
  return {
    preferences: await offered(routes.accountTab('preferences')),
    newWorkspace: await offered(routes.newWorkspace(FAKE_IDS.org)),
    automation: await offered(routes.newAutomation(FAKE_IDS.org)),
  }
}

describe('the model pickers of the shell', () => {
  test("each picker of the owner hides the models that the owner's own endpoint does not list, and keeps the model that it shows", async () => {
    const kept = ['Opus 5.5', 'Fable 5.1', 'GPT-6.1 Sol', 'GPT-6 Astra']
    expect(await pickerModels(serverWithList())).toEqual({
      preferences: kept,
      newWorkspace: kept,
      automation: kept,
    })
  })

  test('the pickers of a new session of an org follow the last list of the org endpoint while the server names the org login as the default login, and the default model of the account follows the own logins', async () => {
    const server = new FakeApiServer()
    server.json(
      'GET',
      ACCOUNT_PATHS.account,
      accountWithDefaults(
        'admin',
        { claude: 'org', codex: 'own' },
        { ownLogins: true, orgModelList: orgListWithout('Fable 5.1') },
      ),
    )
    const onOrgList = ['Opus 5.5', 'Sonnet 5.5', 'GPT-6.1 Sol', 'GPT-6 Astra']
    expect(await pickerModels(server)).toEqual({
      preferences: labels,
      newWorkspace: onOrgList,
      automation: onOrgList,
    })
  })
})
