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
import { endpointReadOf } from './endpoint-reads'
import {
  flushMicrotasks,
  HeldRequests,
  requestLines,
  testServices,
} from './test-kit'

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

  test('a remove after a pending share reply leaves the login removed', async () => {
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
    const remove = app.account.removeLogin('claude')
    held.release('PATCH', path)
    await Promise.all([share, remove])
    expect(app.account.login('claude')).toEqual({
      agent: 'claude',
      connected: false,
    })
  })

  test('a remove after a pending model-list read leaves the login removed', async () => {
    const server = new FakeApiServer()
    const held = new HeldRequests(server)
    server.json('GET', ACCOUNT_PATHS.account, {
      ...coreFixtures().account,
      agentLogins: endpointLoginFixtures(FAKE_TIME),
    })
    const app = new AppModel(testServices(server, { fetch: held.fetch }))
    await app.start()
    server.json('POST', refreshAgentLoginModelsPath('claude'), {
      modelListReadFailed: false,
    })
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    const refresh = app.account.refreshModels('claude')
    const remove = app.account.removeLogin('claude')
    held.release('GET', ACCOUNT_PATHS.account)
    await Promise.all([refresh, remove])
    expect(app.account.login('claude')).toEqual({
      agent: 'claude',
      connected: false,
    })
  })
  test('the note and warning belong to their saved login after a queued Refresh, remove, and save, until another tab saves', async () => {
    const server = new FakeApiServer()
    const [, codex] = endpointLoginFixtures(FAKE_TIME)
    if (!codex?.connected) throw new Error('The Codex fixture is missing.')
    serveLogins(server, [claude, codex])
    const { app, held } = await startedWithHolds(server)
    const reads = () =>
      endpointReadOf(
        app.account.endpointReads.get(),
        app.account.login('codex'),
      )
    const refreshPath = refreshAgentLoginModelsPath('codex')
    server.json('POST', refreshPath, { modelListReadFailed: true })
    held.holdAnswer('POST', refreshPath)
    const refresh = app.account.refreshModels('codex')
    const remove = app.account.removeLogin('codex')
    const saved = { ...codex, updatedAt: FAKE_TIME + 1_000 }
    server.json('PUT', agentLoginPath('codex'), {
      ...saved,
      endpointV1Added: true,
      modelListReadFailed: false,
    })
    serveLogins(server, [claude, saved])
    const save = app.account.saveLogin({
      agent: 'codex',
      kind: 'endpoint',
      endpoint: 'https://proxy.example.test',
      secret: 'key-of-the-proxy',
    })
    held.release('POST', refreshPath)
    await Promise.all([refresh, remove, save])
    const afterRefresh = reads()
    serveLogins(server, [claude, { ...saved, updatedAt: FAKE_TIME + 2_000 }])
    await app.account.refreshLogins()
    expect({ afterRefresh, afterOtherTab: reads() }).toEqual({
      afterRefresh: { addedV1: true, readFailed: false },
      afterOtherTab: { addedV1: false, readFailed: false },
    })
  })

  test('a remove waits for an earlier login read, leaves its login removed, and keeps the other login of the read', async () => {
    const server = new FakeApiServer()
    const chatGpt = { ...claude, agent: 'codex' } as const
    serveLogins(server, [claude, chatGpt])
    const { app, held } = await startedWithHolds(server)
    const stopped = { ...chatGpt, unusableCause: 'OpenAI ended the sign-in.' }
    // The server reads the logins before the remove.
    serveLogins(server, [claude, stopped])
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    const from = server.requests.length
    const read = app.account.refreshLogins()
    const remove = app.account.removeLogin('claude')
    await flushMicrotasks()
    const beforeReply = requestLines(server).slice(from)
    held.release('GET', ACCOUNT_PATHS.account)
    await Promise.all([read, remove])
    expect(beforeReply).toEqual([`GET ${ACCOUNT_PATHS.account}`])
    expect({
      claude: app.account.login('claude'),
      codex: app.account.login('codex'),
    }).toEqual({
      claude: { agent: 'claude', connected: false },
      codex: stopped,
    })
  })

  test('a login read after a pending share reply keeps the saved share setting', async () => {
    const server = new FakeApiServer()
    const { app, held } = await startedWithHolds(server)
    const path = agentLoginPath('claude')
    const shared = { ...claude, noReuse: false }
    server.json('PATCH', path, shared)
    held.holdAnswer('PATCH', path)
    const share = app.account.setNoReuse('claude', false)
    // The held read has the older share setting.
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
