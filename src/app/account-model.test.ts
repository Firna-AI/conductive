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
  test('saves Codex tokens through the dev backend and keeps sharing until the kind changes', async () => {
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
    const save = (kind: 'token' | 'api-key', secret = 'codex-secret') =>
      app.account.saveLogin({ agent: 'codex', kind, secret })
    await expect(save('token')).resolves.toBeUndefined()
    expect(app.account.login('codex')).toEqual({
      agent: 'codex',
      connected: true,
      kind: 'token',
      noReuse: true,
      updatedAt: FAKE_TIME,
    })
    await app.account.setNoReuse('codex', false)
    await save('token', 'rotated-token')
    expect(app.account.login('codex')).toMatchObject({
      kind: 'token',
      noReuse: false,
    })
    await app.account.setNoReuse('codex', true)
    await save('api-key')
    expect(app.account.login('codex')).toMatchObject({
      kind: 'api-key',
      noReuse: false,
    })
    await save('token')
    expect(app.account.login('codex')).toMatchObject({
      kind: 'token',
      noReuse: true,
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
