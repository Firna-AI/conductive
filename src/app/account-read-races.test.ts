import { expect, test } from 'vitest'
import { ACCOUNT_PATHS, refreshAgentLoginModelsPath } from '../shared/account'
import { endpointLoginFixtures } from '../test-support/fixtures/agent-logins'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { acme, accountWithDefaults } from './default-logins.test-support'
import { newSessionLogin } from './default-logins'
import {
  codexLogin,
  serveLoginStatus,
  startedLoginOwner,
} from './login-status.test-support'
import { flushMicrotasks } from './test-kit'

test('a recovery fact keeps an older failed account reply from changing the login or default and requests a replacement', async () => {
  const { app, server, held, observation, reads } = await startedLoginOwner()
  serveLoginStatus(server, 'failed', null)
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  app.account.observeLogin(observation)
  await flushMicrotasks()
  const recovered = { ...observation, available: true }
  serveLoginStatus(server, 'usable', 'own')
  app.account.observeLogin(recovered)
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  held.release('GET', ACCOUNT_PATHS.account)
  await flushMicrotasks()
  expect(app.account.login('codex')).toEqual(codexLogin)
  const account = app.account.account.get()
  expect(account && newSessionLogin(account, acme.id, 'codex')).toBe('own')
  expect(app.account.loginObservationCurrent(recovered)).toBe(false)
  expect(reads()).toBe(3)
  held.release('GET', ACCOUNT_PATHS.account)
  await app.account.refreshLogins()
  expect(app.account.login('codex')).toEqual(codexLogin)
  expect(app.account.loginObservationCurrent(recovered)).toBe(true)
})

test('a matching unavailable fact keeps an org-login repair reply that names a usable fallback for either agent', async () => {
  for (const agent of ['claude', 'codex'] as const) {
    const { app, server, held, observation } = await startedLoginOwner(
      'failed',
      null,
    )
    const repaired = accountWithDefaults('admin', {
      claude: agent === 'claude' ? 'org' : null,
      codex: agent === 'codex' ? 'org' : null,
    })
    server.json('GET', ACCOUNT_PATHS.account, repaired)
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    const repair = app.account.orgLoginChanged(agent)
    await flushMicrotasks()
    const fact = { ...observation, agent }
    app.account.observeLogin(fact)
    held.release('GET', ACCOUNT_PATHS.account)
    await repair
    const account = app.account.account.get()
    expect(account && newSessionLogin(account, acme.id, agent), agent).toBe(
      'org',
    )
    expect(app.account.loginObservationCurrent(fact), agent).toBe(true)
  }
})

test('a fact during the Refresh POST permits its later GET to show the new model list before a queued repair', async () => {
  const { app, server, held, observation } = await startedLoginOwner()
  const logins = endpointLoginFixtures(FAKE_TIME)
  const account = accountWithDefaults('admin', { claude: 'own', codex: 'own' })
  server.json('GET', ACCOUNT_PATHS.account, { ...account, agentLogins: logins })
  await app.account.refreshLogins()
  const path = refreshAgentLoginModelsPath('claude')
  server.json('POST', path, { modelListReadFailed: false })
  held.holdAnswer('POST', path)
  const refresh = app.account.refreshModels('claude')
  await flushMicrotasks()
  app.account.observeLogin({ ...observation, agent: 'claude' })
  const refreshed = {
    ...logins[0],
    modelList: { missing: [], checkedAt: FAKE_TIME + 60_000 },
  }
  server.json('GET', ACCOUNT_PATHS.account, {
    ...account,
    agentLogins: [refreshed, logins[1]],
  })
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  held.release('POST', path)
  await flushMicrotasks()
  held.release('GET', ACCOUNT_PATHS.account)
  await refresh
  expect(app.account.login('claude')).toEqual(refreshed)
  held.release('GET', ACCOUNT_PATHS.account)
  await app.account.refreshLogins()
})
