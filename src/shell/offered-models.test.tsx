// @vitest-environment happy-dom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
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
import { openApp } from './routines/routine-test-kit'
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

describe('the model pickers of the shell', () => {
  test("each picker of the owner hides the models that the owner's own endpoint does not list, and keeps the model that it shows", async () => {
    const { navigation, view } = await openApp(
      serverWithList(),
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
    const kept = ['Opus 5.5', 'Fable 5.1', 'GPT-6.1 Sol', 'GPT-6 Astra']
    expect({
      preferences: await offered(routes.accountTab('preferences')),
      newWorkspace: await offered(routes.newWorkspace(FAKE_IDS.org)),
      routine: await offered(routes.newRoutine(FAKE_IDS.org)),
    }).toEqual({ preferences: kept, newWorkspace: kept, routine: kept })
  })
})
