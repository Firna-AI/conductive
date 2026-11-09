import { describe, expect, test } from 'vitest'
import { agentLoginPath } from '../shared/account'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import { HeldRequests, testServices } from './test-kit'

describe('AccountModel', () => {
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
