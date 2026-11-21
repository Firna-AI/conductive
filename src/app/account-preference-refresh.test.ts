import { expect, test } from 'vitest'
import { ACCOUNT_PATHS, type AccountResponse } from '../shared/account'
import { readShortcutKeyText } from '../shared/shortcut-key'
import { FakeApiServer } from '../test-support/fake-api'
import { coreFixtures } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import {
  flushMicrotasks,
  HeldRequests,
  ManualDelay,
  ManualFocus,
  ManualVisibility,
  requestLines,
  testServices,
} from './test-kit'

const choice = {
  agent: 'codex',
  model: 'gpt-5.2',
  effort: 'high',
  fast: false,
} as const
const changes = [
  { command: 'command-palette', keys: [readShortcutKeyText('Shift+Meta+P')] },
] as const

async function startedAccount() {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const focus = new ManualFocus()
  const timer = new ManualDelay()
  const visible = new ManualVisibility()
  const initial = { ...coreFixtures().account, operator: true }
  server.json('GET', ACCOUNT_PATHS.account, initial)
  const app = new AppModel(
    testServices(server, {
      fetch: held.fetch,
      onFocus: focus.onFocus,
      delay: timer.delay,
      visible,
    }),
  )
  await app.start()
  const changed: AccountResponse = {
    ...initial,
    defaultChoice: choice,
    newWorkspaceView: 'dialog',
    shortcuts: { mac: changes, other: [] },
    operator: false,
  }
  return { app, server, held, focus, timer, visible, initial, changed }
}

test('a page return and the existing notice timer refresh every account preference and operator access', async () => {
  const { app, server, focus, timer, initial, changed } = await startedAccount()
  server.json('GET', ACCOUNT_PATHS.account, changed)
  focus.focus()
  await flushMicrotasks()
  expect(app.account.account.get()).toEqual(changed)
  const stop = app.account.watchMissingLogin()
  await flushMicrotasks()
  server.json('GET', ACCOUNT_PATHS.account, initial)
  await timer.run(60_000)
  expect(app.account.account.get()).toEqual(initial)
  stop()
})

test('an older account reply keeps each successful local preference write and operator refusal while updating unrelated fields', async () => {
  const { app, server, held, initial, changed } = await startedAccount()
  const githubAppUrl =
    'https://github.com/apps/conductive-updated/installations/new'
  server.json('GET', ACCOUNT_PATHS.account, { ...initial, githubAppUrl })
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  const read = app.account.refreshLogins()
  await flushMicrotasks()
  server.json('PUT', ACCOUNT_PATHS.defaultModel, { choice })
  server.json('PUT', ACCOUNT_PATHS.newWorkspaceView, { view: 'dialog' })
  server.json('PUT', ACCOUNT_PATHS.shortcuts, { keyboard: 'mac', changes })
  await app.account.setDefaultChoice(choice)
  await app.account.setNewWorkspaceView('dialog')
  await app.account.saveShortcuts({ keyboard: 'mac', changes })
  app.account.refuseOperator()
  held.release('GET', ACCOUNT_PATHS.account)
  await read
  expect(app.account.account.get()).toEqual({ ...changed, githubAppUrl })
  server.json('GET', ACCOUNT_PATHS.account, initial)
  await app.account.refreshLogins()
  expect(app.account.account.get()).toEqual(initial)
})

test('a preference write answer commits only its field after a newer account read', async () => {
  const { app, server, held, initial, changed } = await startedAccount()
  server.json('PUT', ACCOUNT_PATHS.defaultModel, { choice })
  held.holdAnswer('PUT', ACCOUNT_PATHS.defaultModel)
  const save = app.account.setDefaultChoice(choice)
  await flushMicrotasks()
  server.json('GET', ACCOUNT_PATHS.account, {
    ...changed,
    defaultChoice: initial.defaultChoice,
  })
  await app.account.refreshLogins()
  held.release('PUT', ACCOUNT_PATHS.defaultModel)
  await save
  expect(app.account.account.get()).toEqual(changed)
})

test('a caller-slot login repair also refreshes non-login account fields', async () => {
  const { app, server, initial, changed } = await startedAccount()
  const complete = { ...changed, defaultLogins: [] }
  app.account.account.set({ ...initial, defaultLogins: [] })
  server.json('GET', ACCOUNT_PATHS.account, complete)
  await app.account.orgLoginChanged('claude')
  expect(app.account.account.get()).toEqual(complete)
})

test('independent agent repair replies keep the non-login fields of the newer GET', async () => {
  const { app, server, held, initial, changed } = await startedAccount()
  app.account.account.set({ ...initial, defaultLogins: [] })
  server.json('GET', ACCOUNT_PATHS.account, { ...initial, defaultLogins: [] })
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  const older = app.account.orgLoginChanged('claude')
  await flushMicrotasks()
  server.json('GET', ACCOUNT_PATHS.account, { ...changed, defaultLogins: [] })
  await app.account.orgLoginChanged('codex')
  expect(app.account.account.get()).toEqual({ ...changed, defaultLogins: [] })
  held.release('GET', ACCOUNT_PATHS.account)
  await older
  expect(app.account.account.get()).toEqual({ ...changed, defaultLogins: [] })
})

test('a preference write from an old boot cannot replace a restarted account', async () => {
  const { app, server, held, changed, initial } = await startedAccount()
  server.json('PUT', ACCOUNT_PATHS.defaultModel, { choice })
  held.holdAnswer('PUT', ACCOUNT_PATHS.defaultModel)
  const save = app.account.setDefaultChoice(choice)
  await flushMicrotasks()
  const queuedSave = app.account.setNewWorkspaceView('page')
  server.json('PUT', ACCOUNT_PATHS.newWorkspaceView, { view: 'page' })
  server.json('GET', ACCOUNT_PATHS.account, {
    ...changed,
    defaultChoice: initial.defaultChoice,
  })
  await app.start()
  held.release('PUT', ACCOUNT_PATHS.defaultModel)
  await Promise.all([save, queuedSave])
  expect(
    requestLines(server).filter((line) => line.startsWith('PUT ')),
  ).toEqual([`PUT ${ACCOUNT_PATHS.defaultModel}`])
  expect(app.account.account.get()).toEqual({
    ...changed,
    defaultChoice: initial.defaultChoice,
  })
})
