import { describe, expect, test } from 'vitest'
import {
  ACCOUNT_PATHS,
  agentLoginPath,
  refreshAgentLoginModelsPath,
  type AgentLoginStatus,
} from '../shared/account'
import { FakeApiServer } from '../test-support/fake-api'
import { FakeWorkspaceEvents } from '../test-support/fake-events'
import { endpointLoginFixtures } from '../test-support/fixtures/agent-logins'
import { coreFixtures, FAKE_TIME } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import { accountRoutes } from './dev/account-routes'
import { createBackend } from './dev/backend'
import { readDevOptions } from './dev/options'
import { routeFetch } from './dev/router'
import { seedState } from './dev/seed'
import { HeldRequests, testServices } from './test-kit'

/** The Claude token of the fixtures, which other members do not use. */
const claude = {
  agent: 'claude',
  connected: true,
  kind: 'token',
  noReuse: true,
  updatedAt: FAKE_TIME,
} as const satisfies AgentLoginStatus

/** Serves the account of the fixtures with these logins. */
function serveLogins(
  server: FakeApiServer,
  agentLogins: readonly AgentLoginStatus[],
): void {
  server.json('GET', ACCOUNT_PATHS.account, {
    ...coreFixtures().account,
    agentLogins,
  })
}

/** The app over the fake API, after its first load, with held requests. */
async function startedWithHolds(server: FakeApiServer) {
  const held = new HeldRequests(server)
  const app = new AppModel(testServices(server, { fetch: held.fetch }))
  await app.start()
  return { app, held }
}

describe('AccountModel', () => {
  test('a ChatGPT sign-in through the dev backend connects Codex not shared, a new sign-in keeps the share setting, and a change of kind takes the default of the new kind', async () => {
    const server = new FakeApiServer()
    const backend = createBackend(
      seedState(readDevOptions('?login=none')),
      new FakeWorkspaceEvents([]),
      () => FAKE_TIME,
      () => 'unused',
    )
    const fetch = routeFetch(
      accountRoutes(backend),
      () => undefined,
      server.fetch,
    )
    const app = new AppModel(testServices(server, { fetch }))
    await app.start()
    const signIn = async () => {
      const { handle } = await app.account.startCodexSignIn()
      const waiting = await app.account.pollCodexSignIn(handle)
      const connected = await app.account.pollCodexSignIn(handle)
      return [waiting.state, connected.state]
    }
    const codex = (noReuse: boolean, kind: 'token' | 'api-key' = 'token') => ({
      agent: 'codex',
      connected: true,
      kind,
      noReuse,
      updatedAt: FAKE_TIME,
    })
    const states = await signIn()
    const connected = app.account.login('codex')
    await app.account.setNoReuse('codex', false)
    await signIn()
    const again = app.account.login('codex')
    await app.account.setNoReuse('codex', true)
    await app.account.saveLogin({
      agent: 'codex',
      kind: 'api-key',
      secret: 'codex-key',
    })
    const key = app.account.login('codex')
    await signIn()
    expect({
      states,
      connected,
      again,
      key,
      token: app.account.login('codex'),
    }).toEqual({
      states: ['waiting', 'connected'],
      connected: codex(true),
      again: codex(false),
      key: codex(false, 'api-key'),
      token: codex(true),
    })
  })

  test('a share reply that comes after the login was removed leaves the login removed', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    const app = new AppModel(testServices(server, { fetch: held.fetch }))
    await app.start()
    const path = agentLoginPath('claude')
    server.json('PATCH', path, {
      agent: 'claude',
      connected: true,
      kind: 'token',
      noReuse: false,
      updatedAt: FAKE_TIME,
    })
    held.holdAnswer('PATCH', path)
    const share = app.account.setNoReuse('claude', false)
    await app.account.removeLogin('claude')
    held.release('PATCH', path)
    await share
    expect(app.account.login('claude')).toEqual({
      agent: 'claude',
      connected: false,
    })
  })

  test('a model list that a refresh reads after the login was removed leaves the login removed', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    server.json('GET', ACCOUNT_PATHS.account, {
      ...coreFixtures().account,
      agentLogins: endpointLoginFixtures(FAKE_TIME),
    })
    const app = new AppModel(testServices(server, { fetch: held.fetch }))
    await app.start()
    server.empty('POST', refreshAgentLoginModelsPath('claude'))
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    const refresh = app.account.refreshModels('claude')
    await app.account.removeLogin('claude')
    held.release('GET', ACCOUNT_PATHS.account)
    await refresh
    expect(app.account.login('claude')).toEqual({
      agent: 'claude',
      connected: false,
    })
  })
  test('a login read that answers after a remove leaves the login removed, and shows the other login of its answer', async () => {
    const server = new FakeApiServer()
    const chatGpt = { ...claude, agent: 'codex' } as const
    serveLogins(server, [claude, chatGpt])
    const { app, held } = await startedWithHolds(server)
    const stopped = { ...chatGpt, unusableCause: 'OpenAI ended the sign-in.' }
    // The server reads the logins before the remove.
    serveLogins(server, [claude, stopped])
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    const read = app.account.refreshLogins()
    await app.account.removeLogin('claude')
    held.release('GET', ACCOUNT_PATHS.account)
    await read
    expect({
      claude: app.account.login('claude'),
      codex: app.account.login('codex'),
    }).toEqual({
      claude: { agent: 'claude', connected: false },
      codex: stopped,
    })
  })

  test('a login read that answers after a share reply keeps the share setting of that reply', async () => {
    const server = new FakeApiServer()
    const { app, held } = await startedWithHolds(server)
    const path = agentLoginPath('claude')
    const shared = { ...claude, noReuse: false }
    server.json('PATCH', path, shared)
    held.holdAnswer('PATCH', path)
    const share = app.account.setNoReuse('claude', false)
    // The server reads the logins before the share change saves.
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    const read = app.account.refreshLogins()
    held.release('PATCH', path)
    await share
    held.release('GET', ACCOUNT_PATHS.account)
    await read
    expect(app.account.login('claude')).toEqual(shared)
  })

  test('a login read that fails keeps the logins that show, with no error', async () => {
    const server = new FakeApiServer()
    const app = new AppModel(testServices(server))
    await app.start()
    const failure = {
      code: 'internal_error',
      message: 'The request failed. Try again.',
    }
    server.json('GET', ACCOUNT_PATHS.account, { error: failure }, 503)
    const read = app.account.refreshLogins()
    await expect(read).resolves.toBeUndefined()
    expect(app.account.login('claude')).toEqual(claude)
  })
})
