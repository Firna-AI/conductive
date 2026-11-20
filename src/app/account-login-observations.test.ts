import { expect, test } from 'vitest'
import { ACCOUNT_PATHS, agentLoginPath } from '../shared/account'
import { sessionPath, sessionsPath } from '../shared/sessions'
import { acme } from './default-logins.test-support'
import { newSessionLogin } from './default-logins'
import {
  codexLogin,
  serveLoginStatus,
  startedLoginOwner,
} from './login-status.test-support'
import { flushMicrotasks } from './test-kit'

test('an unavailable session in the initial list repairs the stale personal default to the server org fallback', async () => {
  const { app, server, chat, kept, session, view, reads, emit } =
    await startedLoginOwner()
  server.json('GET', sessionsPath(acme.id, session.workspaceId), {
    eventNumber: server.events.history().throughEventNumber,
    sessions: [{ ...session, loginAvailable: false }],
    history: [],
  })
  serveLoginStatus(server, 'failed', 'org')
  await chat.start()
  await flushMicrotasks()
  expect(view()).toEqual({
    kind: 'linked',
    owner: null,
    reason: 'unavailable',
    login: { owner: 'org', name: 'Acme' },
  })
  expect(app.account.login('codex')).toEqual({
    ...codexLogin,
    unusableCause: 'refresh_denied',
  })
  expect(reads()).toBe(2)
  emit(false)
  chat.setDraft(session.id, 'Continue on the org login')
  const account = app.account.account.get()
  if (!account) throw new Error('The app has no account')
  app.account.account.set({ ...account })
  await flushMicrotasks()
  expect(reads()).toBe(2)
  kept.clear()
})

test('stream records and session action replies refresh changed login facts without repeated reads', async () => {
  const { app, server, chat, kept, session, emit, reads } =
    await startedLoginOwner()
  await chat.start()
  serveLoginStatus(server, 'failed', 'org')
  emit(false)
  await flushMicrotasks()
  expect(
    app.account.account
      .get()
      ?.defaultLogins?.find((entry) => entry.agent === 'codex')?.login,
  ).toEqual({ type: 'org', orgId: acme.id })
  expect(reads()).toBe(2)

  serveLoginStatus(server, 'usable', 'own')
  await app.account.refreshLogins()
  emit(true)
  serveLoginStatus(server, 'failed', 'org')
  server.json('PATCH', sessionPath(acme.id, session.workspaceId, session.id), {
    eventNumber: server.events.history().throughEventNumber + 1,
    session: { ...session, title: 'New name', loginAvailable: false },
  })
  await chat.rename(session.id, 'New name')
  await flushMicrotasks()
  const account = app.account.account.get()
  expect(account && newSessionLogin(account, acme.id, 'codex')).toBe('org')
  expect(reads()).toBe(4)
  kept.clear()
})

test('an observation during an account read and a queued login write repairs the default in request order', async () => {
  const { app, server, held, observation, reads } = await startedLoginOwner()
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  const oldRead = app.account.refreshLogins()
  await flushMicrotasks()
  server.json('PATCH', agentLoginPath('codex'), codexLogin)
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  const oldWriteRead = app.account.setNoReuse('codex', true)
  await flushMicrotasks()
  serveLoginStatus(server, 'failed', 'org')
  app.account.observeLogin(observation)
  held.release('GET', ACCOUNT_PATHS.account)
  await flushMicrotasks()
  held.release('GET', ACCOUNT_PATHS.account)
  await flushMicrotasks()
  const account = app.account.account.get()
  expect(account && newSessionLogin(account, acme.id, 'codex')).toBe('org')
  expect(reads()).toBe(4)
  await Promise.all([oldRead, oldWriteRead])
  const after = app.account.account.get()
  expect(after && newSessionLogin(after, acme.id, 'codex')).toBe('org')
  expect(app.account.login('codex')).toEqual({
    ...codexLogin,
    unusableCause: 'refresh_denied',
  })
})

test('a login save during an observation read keeps its newer login and default', async () => {
  const { app, server, held, observation, reads } = await startedLoginOwner()
  serveLoginStatus(server, 'failed', 'org')
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  app.account.observeLogin(observation)
  await flushMicrotasks()
  expect(reads()).toBe(2)
  const saved = {
    ...codexLogin,
    kind: 'api-key',
    updatedAt: codexLogin.updatedAt + 1,
  } as const
  server.json('PUT', agentLoginPath('codex'), saved)
  serveLoginStatus(server, 'usable', 'own', saved)
  const save = app.account.saveLogin({
    agent: 'codex',
    kind: 'api-key',
    secret: 'test-key',
  })
  held.release('GET', ACCOUNT_PATHS.account)
  await save
  await flushMicrotasks()
  expect(app.account.login('codex')).toEqual(saved)
  const account = app.account.account.get()
  expect(account && newSessionLogin(account, acme.id, 'codex')).toBe('own')
})

test('an observation queued during a share write keeps the share setting and repairs the failed status', async () => {
  const { app, server, held, observation } = await startedLoginOwner()
  held.hold('PATCH', agentLoginPath('codex'))
  const write = app.account.setNoReuse('codex', false)
  await flushMicrotasks()
  serveLoginStatus(server, 'failed', 'org')
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  app.account.observeLogin(observation)
  await flushMicrotasks()
  const shared = { ...codexLogin, noReuse: false }
  server.json('PATCH', agentLoginPath('codex'), shared)
  serveLoginStatus(server, 'failed', 'org', shared)
  held.release('PATCH', agentLoginPath('codex'))
  await flushMicrotasks()
  held.release('GET', ACCOUNT_PATHS.account)
  await write
  await flushMicrotasks()
  expect(app.account.login('codex')).toEqual({
    ...shared,
    unusableCause: 'refresh_denied',
  })
})

test('repeated unavailable observations are bounded and another member cannot invalidate the account read', async () => {
  const { app, server, held, observation, reads } = await startedLoginOwner()
  app.account.observeLogin(observation)
  await flushMicrotasks()
  app.account.observeLogin({ ...observation })
  app.account.observeLogin({ ...observation })
  await flushMicrotasks()
  expect(reads()).toBe(2)
  serveLoginStatus(server, 'failed', 'org')
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  const read = app.account.refreshLogins()
  await flushMicrotasks()
  app.account.observeLogin({
    ...observation,
    login: { type: 'personal', userId: 'another-member' },
  })
  held.release('GET', ACCOUNT_PATHS.account)
  await read
  const account = app.account.account.get()
  expect(account && newSessionLogin(account, acme.id, 'codex')).toBe('org')
  expect(reads()).toBe(3)
})
