import { expect, test } from 'vitest'
import { ACCOUNT_PATHS } from '../shared/account'
import { acme } from './default-logins.test-support'
import { newSessionLogin } from './default-logins'
import {
  serveLoginStatus,
  startedLoginOwner,
} from './login-status.test-support'
import { flushMicrotasks } from './test-kit'

test('a shown missing-login notice discovers an org login connected by an admin within its visible-page timer', async () => {
  const { app, server, timer, reads } = await startedLoginOwner('failed', null)
  expect(timer.waits).toEqual([])
  const stop = app.account.watchMissingLogin()
  await flushMicrotasks()
  expect(reads()).toBe(2)
  expect(timer.waits).toEqual([60_000])
  serveLoginStatus(server, 'failed', 'org')
  await timer.run(60_000)
  const account = app.account.account.get()
  expect(account && newSessionLogin(account, acme.id, 'codex')).toBe('org')
  expect(reads()).toBe(3)
  stop()
})

test('missing-login polling follows shown notices, page visibility, and the last notice cleanup', async () => {
  const { app, timer, visible, reads } = await startedLoginOwner('failed', null)
  const stopFirst = app.account.watchMissingLogin()
  const stopSecond = app.account.watchMissingLogin()
  await flushMicrotasks()
  stopFirst()
  expect(timer.waits).toEqual([60_000])
  visible.set(false)
  expect(timer.waits).toEqual([])
  await timer.run(60_000)
  const before = reads()
  visible.set(true)
  await flushMicrotasks()
  expect(reads()).toBe(before + 1)
  expect(timer.waits).toEqual([60_000])
  stopSecond()
  expect(timer.waits).toEqual([])
  await timer.run(60_000)
  expect(reads()).toBe(before + 1)
})

test('an app restart forgets old notice watches, observations, and account replies', async () => {
  const { app, server, timer, held, chat, emit, reads } =
    await startedLoginOwner()
  await chat.start()
  const stopOld = app.account.watchMissingLogin()
  await flushMicrotasks()
  serveLoginStatus(server, 'failed', 'org')
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  const beforeObservation = reads()
  emit(false)
  await flushMicrotasks()
  expect(reads()).toBe(beforeObservation + 1)
  serveLoginStatus(server, 'usable', 'own')
  await app.start()
  expect(timer.waits).not.toContain(60_000)
  const before = reads()
  emit(true)
  emit(false)
  await flushMicrotasks()
  expect(reads()).toBe(before)
  held.release('GET', ACCOUNT_PATHS.account)
  await flushMicrotasks()
  const account = app.account.account.get()
  expect(account && newSessionLogin(account, acme.id, 'codex')).toBe('own')
  const stopNew = app.account.watchMissingLogin()
  await flushMicrotasks()
  stopOld()
  expect(timer.waits.filter((wait) => wait === 60_000)).toEqual([60_000])
  await app.account.signOut()
  expect(timer.waits).not.toContain(60_000)
  stopNew()
  chat.stop()
})
