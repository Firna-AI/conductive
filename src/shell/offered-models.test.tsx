// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import {
  accountWithDefaults,
  orgListWithout,
} from '../app/default-logins.test-support'
import { routes } from '../app/router'
import { ACCOUNT_PATHS, type AccountResponse } from '../shared/account'
import { accessibleName, byRole } from '../test-support/dom-queries'
import { FakeApiServer } from '../test-support/fake-api'
import {
  coreFixtures,
  FAKE_IDS,
  FAKE_TIME,
} from '../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../test-support/mount'
import { sectionTitled } from './account/test-markup'
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
 * The favourites that the open model menu lists above All models, and the
 * models of All models, in their order.
 */
function menuRows() {
  const menu = byRole('menu', 'Model and effort')
  const rows = Array.from(menu.querySelectorAll('[role^="menuitem"]'))
  const all = rows.findIndex((row) => accessibleName(row) === 'All models')
  click(byRole('menuitem', 'All models', menu))
  const models = Array.from(
    byRole('menu', 'All models').querySelectorAll('[role="menuitemradio"]'),
    accessibleName,
  )
  return { favourites: rows.slice(0, all).map(accessibleName), models }
}

/**
 * The favourites and the models that the picker of the preferences, of New
 * workspace, and of a new automation offer, in the app over `server`.
 */
async function pickerMenus(server: FakeApiServer) {
  const { navigation, view } = await openApp(
    server,
    routes.accountTab('preferences'),
  )
  /**
   * The menu of the picker of the page at `address`. On the preferences, it
   * is the picker of New workspaces, because a favourite above it has a
   * picker with the same name.
   */
  const offered = async (address: string) => {
    act(() => navigation.push(address))
    await settle()
    const root =
      address === routes.accountTab('preferences')
        ? sectionTitled(view, 'New workspaces')
        : view
    click(byRole('button', 'Model and effort: Opus 5.5, High', root))
    const rows = menuRows()
    // The first Escape hides All models, and the second closes the menu.
    press(byRole('menu', 'All models'), 'Escape')
    press(byRole('menu', 'Model and effort'), 'Escape')
    await settle()
    return rows
  }
  return {
    preferences: await offered(routes.accountTab('preferences')),
    newWorkspace: await offered(routes.newWorkspace(FAKE_IDS.org)),
    automation: await offered(routes.newAutomation(FAKE_IDS.org)),
  }
}

/** The starting favourites of the account of the fake API. */
const favourites = [
  'Opus 5.5 High',
  'Opus 5.5 Max',
  'Sonnet 5.5 Medium',
  'GPT-6.1 Sol High',
  'GPT-6 Astra Medium',
]

describe('the model pickers of the shell', () => {
  test("each picker of the owner lists the favourites of the account first, and hides the models that the owner's own endpoint does not list, with each favourite on them, and keeps the model that it shows", async () => {
    const kept = {
      favourites: favourites.filter((name) => !name.startsWith('Sonnet')),
      models: ['Opus 5.5', 'Fable 5.1', 'GPT-6.1 Sol', 'GPT-6 Astra'],
    }
    expect(await pickerMenus(serverWithList())).toEqual({
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
    expect(await pickerMenus(server)).toEqual({
      preferences: { favourites, models: labels },
      newWorkspace: { favourites, models: onOrgList },
      automation: { favourites, models: onOrgList },
    })
  })
})
