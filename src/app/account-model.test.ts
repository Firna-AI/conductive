import { describe, expect, test } from 'vitest'
import { agentLoginPath } from '../shared/account'
import { FakeApiServer } from '../test-support/fake-api'
import { FakeWorkspaceEvents } from '../test-support/fake-events'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import { accountRoutes } from './dev/account-routes'
import { createBackend } from './dev/backend'
import { readDevOptions } from './dev/options'
import { routeFetch } from './dev/router'
import { seedState } from './dev/seed'
import { HeldRequests, testServices } from './test-kit'

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
})
