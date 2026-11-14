// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest'
import { productName } from '../../../docs/mockups/src/brand'
import { AppModel } from '../../app/app-model'
import { memoryNavigation, NavigationContext } from '../../app/navigation'
import { routes } from '../../app/router'
import { testServices } from '../../app/test-kit'
import {
  agentLoginPath,
  refreshAgentLoginModelsPath,
  type AgentLoginStatus,
  type RefreshAgentLoginModelsResponse,
  type SaveAgentLoginResponse,
} from '../../shared/account'
import { MODELS_PATH, type Agent, type AgentModel } from '../../shared/agents'
import { GET_STARTED_PATH } from '../../shared/onboarding'
import { byRole, queryAllByRole } from '../../test-support/dom-queries'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_IDS, FAKE_TIME } from '../../test-support/fixtures/core'
import { MOUNTED_TEST_TIMEOUT } from '../../test-support/mount'
import { Shell } from '../Shell'
import { click, mountScreen, settle, typeText } from '../test-mount'
import { fieldNamed } from '../workspace/kept-test-kit'
import { agentItem, openAccount, serveAccount } from './sign-in-test-kit'

vi.setConfig({ testTimeout: MOUNTED_TEST_TIMEOUT })

const note = `${productName} added /v1 to the address, because the endpoint lists its models there.`
const warning = `${productName} couldn't read the model list of this endpoint. Check the address and the key.`
const share =
  'Let other members use this login Their messages in your sessions use this login.'

/**
 * An own endpoint login of `agent` on Cal's proxy. With `missing`, its last
 * model list, read a minute before the clock of the test, did not name
 * those model IDs.
 */
function endpointLogin(
  agent: Agent,
  missing?: readonly string[],
): AgentLoginStatus {
  return {
    agent,
    connected: true,
    kind: 'endpoint',
    host: 'proxy.example.com',
    noReuse: false,
    updatedAt: FAKE_TIME,
    ...(missing
      ? { modelList: { missing, checkedAt: FAKE_TIME - 60_000 } }
      : {}),
  }
}

/** The answer of the save of `login`, with the flags of its model list reads. */
function saveAnswer(
  login: AgentLoginStatus,
  flags: Pick<
    SaveAgentLoginResponse,
    'endpointV1Added' | 'modelListReadFailed'
  > = {},
): SaveAgentLoginResponse {
  return {
    ...login,
    endpointV1Added: false,
    modelListReadFailed: false,
    ...flags,
  }
}

/** Connects an own endpoint at `address` in the open form, and waits. */
async function connectEndpoint(view: HTMLElement, address: string) {
  const kinds = byRole('radiogroup', 'Connect with', view)
  click(byRole('radio', 'Own endpoint', kinds))
  typeText(fieldNamed(view, 'Endpoint'), address)
  typeText(fieldNamed(view, 'API key'), 'key-of-the-proxy')
  click(byRole('button', 'Connect', view))
  await settle()
}

/** The Refresh buttons of the Claude login. */
function claudeRefreshes(view: HTMLElement): HTMLElement[] {
  return queryAllByRole('button', 'Refresh the model list of Claude', view)
}

describe('the reads of the model list of an own endpoint login', () => {
  test('a Codex save that added /v1 shows the note under the host and before the share setting, and a save after Remove shows none', async () => {
    const server = new FakeApiServer()
    const claude = endpointLogin('claude')
    const codex = endpointLogin('codex')
    serveAccount(server, [claude, { agent: 'codex', connected: false }])
    const { view } = await openAccount(server, {}, 'codex')
    await settle()
    const path = agentLoginPath('codex')
    server.json('PUT', path, saveAnswer(codex, { endpointV1Added: true }))
    serveAccount(server, [claude, codex])
    await connectEndpoint(view, 'https://proxy.example.com')
    const noted = [agentItem(view, 'claude'), agentItem(view, 'codex')]
    click(byRole('button', 'Remove Codex', view))
    await settle()
    click(byRole('button', 'Connect Codex', view))
    server.json('PUT', path, saveAnswer(codex))
    await connectEndpoint(view, 'https://proxy.example.com/v1')
    expect({ noted, saved: agentItem(view, 'codex') }).toEqual({
      noted: [
        `Claude Connected Remove Own endpoint at proxy.example.com ${share}`,
        `Codex Connected Remove Own endpoint at proxy.example.com ${note} ${share}`,
      ],
      saved: `Codex Connected Remove Own endpoint at proxy.example.com ${share}`,
    })
  })

  test('a save that read no model list warns under the host with Refresh, and a Refresh that reads a list removes the warning', async () => {
    const server = new FakeApiServer()
    const claude = endpointLogin('claude')
    serveAccount(server, [{ agent: 'claude', connected: false }])
    const { view } = await openAccount(server, {}, 'claude')
    await settle()
    server.json(
      'PUT',
      agentLoginPath('claude'),
      saveAnswer(claude, { modelListReadFailed: true }),
    )
    serveAccount(server, [claude])
    await connectEndpoint(view, 'https://proxy.example.com')
    const warned = agentItem(view, 'claude')
    server.json('POST', refreshAgentLoginModelsPath('claude'), {
      modelListReadFailed: false,
    })
    serveAccount(server, [endpointLogin('claude', [])])
    click(byRole('button', 'Refresh the model list of Claude', view))
    await settle()
    expect({ warned, read: agentItem(view, 'claude') }).toEqual({
      warned: `Claude Connected Remove Own endpoint at proxy.example.com ${warning} Refresh ${share}`,
      read: `Claude Connected Remove Own endpoint at proxy.example.com ${share}`,
    })
  })

  test('a Refresh that reads no list warns above the models of the last list, and the one Refresh of the row moves beside the warning with the focus', async () => {
    const server = new FakeApiServer()
    const models: readonly AgentModel[] = [
      ['claude-opus-5-5', 'Opus 5.5'],
      ['claude-fable-5-1', 'Fable 5.1'],
    ].map(([model, label]) => ({
      agent: 'claude',
      model,
      label,
      efforts: ['high'],
    }))
    server.json('GET', MODELS_PATH, { models })
    // The failed read keeps the last list, so each read of the account gives it.
    serveAccount(server, [endpointLogin('claude', ['claude-fable-5-1'])])
    const { view } = await openAccount(server, {}, null)
    await settle()
    server.json('POST', refreshAgentLoginModelsPath('claude'), {
      modelListReadFailed: true,
    })
    click(byRole('button', 'Refresh the model list of Claude', view))
    await settle()
    const refreshes = claudeRefreshes(view)
    expect({
      item: agentItem(view, 'claude'),
      refreshes: refreshes.length,
      focused: document.activeElement === refreshes[0],
    }).toEqual({
      item: `Claude Connected Remove Own endpoint at proxy.example.com ${warning} Refresh Fable 5.1 is hidden from your model pickers, because this endpoint does not list it. Its model ID is claude-fable-5-1 . Checked 1 minute ago. ${share}`,
      refreshes: 1,
      focused: true,
    })
  })

  test('a Refresh keeps the note of a Codex save that added /v1: one that reads no list adds the warning, and one that reads a list removes only the warning', async () => {
    const server = new FakeApiServer()
    const models: readonly AgentModel[] = [
      ['gpt-6-1-sol', 'GPT-6.1 Sol'],
      ['gpt-6-astra', 'GPT-6 Astra'],
    ].map(([model, label]) => ({
      agent: 'codex',
      model,
      label,
      efforts: ['medium'],
    }))
    server.json('GET', MODELS_PATH, { models })
    serveAccount(server)
    const { view } = await openAccount(server, {}, 'codex')
    await settle()
    server.json(
      'PUT',
      agentLoginPath('codex'),
      saveAnswer(endpointLogin('codex'), { endpointV1Added: true }),
    )
    // The save answers without the list, which the account then holds.
    serveAccount(server, [endpointLogin('codex', ['gpt-6-astra'])])
    await connectEndpoint(view, 'https://proxy.example.com')
    /** Presses Refresh, which gets `answer`, and gives the row after it. */
    const refresh = async (answer: RefreshAgentLoginModelsResponse) => {
      server.json('POST', refreshAgentLoginModelsPath('codex'), answer)
      click(byRole('button', 'Refresh the model list of Codex', view))
      await settle()
      return agentItem(view, 'codex')
    }
    const failed = await refresh({ modelListReadFailed: true })
    // The next read works, and its list names each model of the app.
    serveAccount(server, [endpointLogin('codex', [])])
    const read = await refresh({ modelListReadFailed: false })
    expect({ failed, read }).toEqual({
      failed: `Codex Connected Remove Own endpoint at proxy.example.com ${note} ${warning} Refresh GPT-6 Astra is hidden from your model pickers, because this endpoint does not list it. Its model ID is gpt-6-astra . Checked 1 minute ago. ${share}`,
      read: `Codex Connected Remove Own endpoint at proxy.example.com ${note} ${share}`,
    })
  })

  test('the agent step of Get started keeps the note of a Codex save when the step is done and draws the list again', async () => {
    const server = new FakeApiServer()
    server.json('GET', GET_STARTED_PATH, {
      orgId: FAKE_IDS.org,
      steps: [
        { step: 'github-app', complete: true },
        { step: 'org', complete: true },
        { step: 'agent-login', complete: false },
      ],
    })
    const none = { connected: false } as const
    serveAccount(server, [
      { agent: 'claude', ...none },
      { agent: 'codex', ...none },
    ])
    const view = mountScreen(
      new AppModel(testServices(server)),
      <NavigationContext.Provider value={memoryNavigation(routes.getStarted())}>
        <Shell />
      </NavigationContext.Provider>,
    )
    await settle()
    click(byRole('button', 'Connect Codex', view))
    const codex = endpointLogin('codex')
    server.json(
      'PUT',
      agentLoginPath('codex'),
      saveAnswer(codex, { endpointV1Added: true }),
    )
    serveAccount(server, [{ agent: 'claude', ...none }, codex])
    await connectEndpoint(view, 'https://proxy.example.com')
    expect({
      done: queryAllByRole('button', 'Open Acme', view).length,
      codex: agentItem(view, 'codex'),
    }).toEqual({
      done: 1,
      codex: `Codex Connected Own endpoint at proxy.example.com ${note}`,
    })
  })
})
