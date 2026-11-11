import { describe, expect, test } from 'vitest'
import {
  ACCOUNT_PATHS,
  agentLoginPath,
  refreshAgentLoginModelsPath,
} from '../shared/account'
import { FakeApiServer } from '../test-support/fake-api'
import { endpointLoginFixtures } from '../test-support/fixtures/agent-logins'
import { coreFixtures, FAKE_TIME } from '../test-support/fixtures/core'
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
})
