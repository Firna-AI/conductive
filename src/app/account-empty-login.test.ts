import { expect, test } from 'vitest'
import { ACCOUNT_PATHS, agentLoginPath } from '../shared/account'
import { sessionsPath } from '../shared/sessions'
import { acme } from './default-logins.test-support'
import {
  codexLogin,
  serveLoginStatus,
  startedLoginOwner,
} from './login-status.test-support'
import { flushMicrotasks } from './test-kit'

test('an empty session excludes cached own and org defaults until a newer complete account reply confirms the org default', async () => {
  for (const cached of ['own', 'org'] as const) {
    const { app, server, held, chat, kept, session, view, reads } =
      await startedLoginOwner('usable', cached)
    server.json('GET', sessionsPath(acme.id, session.workspaceId), {
      eventNumber: server.events.history().throughEventNumber,
      sessions: [
        { ...session, login: null, defaultLogin: null, loginAvailable: false },
        {
          ...session,
          id: 'another-empty-session',
          login: null,
          defaultLogin: null,
        },
      ],
      history: [],
    })
    serveLoginStatus(server, 'failed', cached === 'org' ? null : 'org')
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    await chat.start()
    await flushMicrotasks()
    expect(view(), cached).toEqual({ kind: 'missing', linked: false })
    expect(reads(), cached).toBe(2)

    server.json('PUT', agentLoginPath('codex'), codexLogin)
    held.holdAnswer('GET', ACCOUNT_PATHS.account)
    const save = app.account.saveLogin({
      agent: 'codex',
      kind: 'api-key',
      secret: 'new-key',
    })
    await flushMicrotasks()
    expect(view(), cached).toEqual({ kind: 'missing', linked: false })
    held.release('GET', ACCOUNT_PATHS.account)
    await flushMicrotasks()
    expect(view(), cached).toEqual({ kind: 'missing', linked: false })
    held.release('GET', ACCOUNT_PATHS.account)
    await save
    expect(view(), cached).toEqual(
      cached === 'org'
        ? { kind: 'missing', linked: false }
        : { kind: 'session', login: { owner: 'org', name: 'Acme' } },
    )
    serveLoginStatus(server, 'failed', 'org')
    await app.account.refreshLogins()
    expect(view(), cached).toEqual({
      kind: 'session',
      login: { owner: 'org', name: 'Acme' },
    })
    kept.clear()
  }
})

test('an empty-session missing notice clears when its timer finds a newly connected org login and stays missing after its removal', async () => {
  const { app, server, timer, chat, kept, session, view, reads } =
    await startedLoginOwner('failed', null)
  const empty = {
    ...session,
    login: null,
    defaultLogin: null,
    loginAvailable: false,
  }
  server.json('GET', sessionsPath(acme.id, session.workspaceId), {
    eventNumber: server.events.history().throughEventNumber,
    sessions: [empty],
    history: [],
  })
  await chat.start()
  const stop = chat.watchMissingLogin()
  await flushMicrotasks()
  expect(view()).toEqual({ kind: 'missing', linked: false })
  expect(reads()).toBe(2)
  serveLoginStatus(server, 'failed', 'org')
  await timer.run(60_000)
  expect(view()).toEqual({
    kind: 'session',
    login: { owner: 'org', name: 'Acme' },
  })
  stop()

  serveLoginStatus(server, 'failed', null)
  await app.account.refreshLogins()
  expect(view()).toEqual({ kind: 'missing', linked: false })
  kept.clear()
})
