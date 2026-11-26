import { describe, expect, test, vi } from 'vitest'
import { ACCOUNT_PATHS, agentLoginPath } from '../shared/account'
import { orgAgentLoginPath } from '../shared/org-settings'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import { newSessionLogin } from './default-logins'
import {
  accountWithDefaults,
  acme,
  type DefaultsOf,
} from './default-logins.test-support'
import {
  flushMicrotasks,
  HeldRequests,
  ManualFocus,
  testServices,
} from './test-kit'

/** The account of Cal, whose server names `defaults` in Acme. */
function serveDefaults(
  server: FakeApiServer,
  defaults: DefaultsOf,
  ownLogins: boolean,
): void {
  server.json(
    'GET',
    ACCOUNT_PATHS.account,
    accountWithDefaults('admin', defaults, { ownLogins }),
  )
}

/** The login that a new Claude session of Cal in Acme takes, as the app shows it. */
function claudeDefault(app: AppModel) {
  const account = app.account.account.get()
  return account ? newSessionLogin(account, acme.id, 'claude') : 'no account'
}

/** The app over `server`, after its first load, with held requests. */
async function started(server: FakeApiServer) {
  const held = new HeldRequests(server)
  const app = new AppModel(testServices(server, { fetch: held.fetch }))
  await app.start()
  return { app, held }
}

const claudeKey = {
  agent: 'claude',
  connected: true,
  kind: 'api-key',
  noReuse: false,
  updatedAt: FAKE_TIME,
} as const

describe('the default logins of the account', () => {
  test('a save and a remove of an own login read the default logins again, so a new session takes the login that the server names after the change', async () => {
    const server = new FakeApiServer()
    serveDefaults(server, { claude: 'org', codex: null }, false)
    const { app } = await started(server)
    const before = claudeDefault(app)
    server.json('PUT', agentLoginPath('claude'), claudeKey)
    serveDefaults(server, { claude: 'own', codex: null }, true)
    await app.account.saveLogin({
      agent: 'claude',
      kind: 'api-key',
      secret: 'sk-ant-test',
    })
    const saved = claudeDefault(app)
    server.json('DELETE', agentLoginPath('claude'), {})
    serveDefaults(server, { claude: 'org', codex: null }, false)
    await app.account.removeLogin('claude')
    expect({ before, saved, removed: claudeDefault(app) }).toEqual({
      before: 'org',
      saved: 'own',
      removed: 'org',
    })
  })

  test('a change of the switch of an org login reads the default logins again', async () => {
    const server = new FakeApiServer()
    serveDefaults(server, { claude: 'own', codex: 'own' }, true)
    const { app } = await started(server)
    const before = claudeDefault(app)
    server.json('PATCH', orgAgentLoginPath(acme.id, 'claude'), {
      agent: 'claude',
      connected: true,
      kind: 'api-key',
      useForEveryMember: true,
      updatedAt: FAKE_TIME,
    })
    serveDefaults(server, { claude: 'org', codex: 'own' }, true)
    await app.org(acme.id).agentLogins.setUseForEveryMember('claude', true)
    await vi.waitFor(() => expect(claudeDefault(app)).toBe('org'))
    expect(before).toBe('own')
  })

  test('a return to the page reads the default logins again, such as after an admin turned the switch on in another tab', async () => {
    const server = new FakeApiServer()
    serveDefaults(server, { claude: 'own', codex: 'own' }, true)
    const focus = new ManualFocus()
    const app = new AppModel(testServices(server, { onFocus: focus.onFocus }))
    await app.start()
    const before = claudeDefault(app)
    serveDefaults(server, { claude: 'org', codex: 'own' }, true)
    focus.focus()
    await vi.waitFor(() => expect(claudeDefault(app)).toBe('org'))
    expect(before).toBe('own')
  })

  test('a share change queued during an account read shows the server default logins after the change', async () => {
    const server = new FakeApiServer()
    serveDefaults(server, { claude: 'own', codex: 'own' }, true)
    const { app, held } = await started(server)
    // An admin turned on "Use for every member" of Acme in another tab.
    serveDefaults(server, { claude: 'org', codex: 'own' }, true)
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    const read = app.account.refreshLogins()
    await flushMicrotasks()
    server.json('PATCH', agentLoginPath('claude'), {
      ...claudeKey,
      kind: 'token',
      noReuse: false,
    })
    const share = app.account.setNoReuse('claude', false)
    held.release('GET', ACCOUNT_PATHS.account)
    await Promise.all([read, share])
    expect(claudeDefault(app)).toBe('org')
  })

  test('a read that started before a remove of an own login does not show its older default logins', async () => {
    const server = new FakeApiServer()
    serveDefaults(server, { claude: 'own', codex: null }, true)
    const { app, held } = await started(server)
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    const read = app.account.refreshLogins()
    await flushMicrotasks()
    server.json('DELETE', agentLoginPath('claude'), {})
    serveDefaults(server, { claude: 'org', codex: null }, false)
    const remove = app.account.removeLogin('claude')
    held.release('GET', ACCOUNT_PATHS.account)
    await Promise.all([read, remove])
    expect(claudeDefault(app)).toBe('org')
  })
})
