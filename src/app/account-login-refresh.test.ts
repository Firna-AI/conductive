import { expect, test } from 'vitest'

import {
  ACCOUNT_PATHS,
  refreshAgentLoginModelsPath,
  type AgentLoginStatus,
} from '../shared/account'
import { FakeApiServer } from '../test-support/fake-api'
import { endpointLoginFixtures } from '../test-support/fixtures/agent-logins'
import { coreFixtures, FAKE_TIME } from '../test-support/fixtures/core'
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

function serveLogins(
  server: FakeApiServer,
  agentLogins: readonly AgentLoginStatus[],
) {
  server.json('GET', ACCOUNT_PATHS.account, {
    ...coreFixtures().account,
    agentLogins,
  })
}

async function startedWithEndpoints() {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const timer = new ManualDelay()
  const focus = new ManualFocus()
  const visible = new ManualVisibility()
  const logins = endpointLoginFixtures(FAKE_TIME).map((login) => ({
    ...login,
    modelList: { missing: ['new-model'], checkedAt: FAKE_TIME },
  }))
  serveLogins(server, logins)
  const app = new AppModel(
    testServices(server, {
      fetch: held.fetch,
      delay: timer.delay,
      onFocus: focus.onFocus,
      visible,
    }),
  )
  await app.start()
  return { app, server, held, timer, focus, visible, logins }
}

test('an open tab receives model lists that background discovery saves after the tab loads', async () => {
  const { app, server, timer, logins } = await startedWithEndpoints()
  const discovered = logins.map((login) => ({
    ...login,
    modelList: { missing: [], checkedAt: FAKE_TIME + 600_000 },
  }))
  serveLogins(server, discovered)
  await timer.run(60_000)
  expect(app.account.account.get()?.agentLogins).toEqual(discovered)
  expect(
    requestLines(server).filter(
      (line) => line === `GET ${ACCOUNT_PATHS.account}`,
    ),
  ).toHaveLength(2)
})

test('a hidden page stops timed account reads and reads once before polling resumes when shown', async () => {
  const { app, server, timer, focus, visible, logins } =
    await startedWithEndpoints()
  expect(timer.waits).toEqual([60_000])
  visible.set(false)
  focus.focus()
  await timer.run(60_000)
  expect
    .soft(
      requestLines(server).filter(
        (line) => line === `GET ${ACCOUNT_PATHS.account}`,
      ),
    )
    .toHaveLength(1)
  expect.soft(timer.waits).toEqual([])

  const discovered = logins.map((login) => ({
    ...login,
    modelList: { missing: [], checkedAt: FAKE_TIME + 600_000 },
  }))
  serveLogins(server, discovered)
  visible.set(true)
  await flushMicrotasks()
  expect(app.account.account.get()?.agentLogins).toEqual(discovered)
  expect(
    requestLines(server).filter(
      (line) => line === `GET ${ACCOUNT_PATHS.account}`,
    ),
  ).toHaveLength(2)
  expect(timer.waits).toEqual([60_000])

  await timer.run(60_000)
  expect(
    requestLines(server).filter(
      (line) => line === `GET ${ACCOUNT_PATHS.account}`,
    ),
  ).toHaveLength(3)
  expect(timer.waits).toEqual([60_000])
})

test('page returns share one account read and keep login and preference changes made during the read', async () => {
  const { app, server, held, focus, logins } = await startedWithEndpoints()
  const discovered = logins.map((login) => ({
    ...login,
    modelList: { missing: [], checkedAt: FAKE_TIME + 600_000 },
  }))
  serveLogins(server, discovered)
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  focus.focus()
  focus.focus()
  await flushMicrotasks()
  expect(
    requestLines(server).filter(
      (line) => line === `GET ${ACCOUNT_PATHS.account}`,
    ),
  ).toHaveLength(2)
  const choice = {
    agent: 'codex',
    model: 'new-model',
    effort: 'high',
    fast: false,
  } as const
  server.json('PUT', ACCOUNT_PATHS.defaultModel, { choice })
  await app.account.setDefaultChoice(choice)
  const remove = app.account.removeLogin('claude')
  const read = app.account.refreshLogins()
  held.release('GET', ACCOUNT_PATHS.account)
  await Promise.all([read, remove])
  expect(app.account.login('claude')).toEqual({
    agent: 'claude',
    connected: false,
  })
  expect(app.account.login('codex')).toEqual(discovered[1])
  expect(app.account.account.get()?.defaultChoice).toEqual(choice)
})

test('a Refresh of an own endpoint shows its new list before a queued page-return read', async () => {
  const { app, server, held, focus, logins } = await startedWithEndpoints()
  const path = refreshAgentLoginModelsPath('claude')
  server.json('POST', path, { modelListReadFailed: false })
  held.holdAnswer('POST', path)
  const refresh = app.account.refreshModels('claude')
  await flushMicrotasks()
  focus.focus()
  const pageRead = app.account.refreshLogins()
  const refreshed = logins.map((login) => ({
    ...login,
    modelList: { missing: [], checkedAt: FAKE_TIME + 600_000 },
  }))
  serveLogins(server, refreshed)
  held.release('POST', path)
  await Promise.all([refresh, pageRead])
  expect(app.account.login('claude')).toEqual(refreshed[0])
})

test('account polling stops after the last own endpoint is removed and page returns still read logins', async () => {
  const { app, server, timer, focus } = await startedWithEndpoints()
  await app.account.removeLogin('claude')
  await app.account.removeLogin('codex')
  expect(timer.waits).toEqual([])
  serveLogins(server, [
    { agent: 'claude', connected: false },
    { agent: 'codex', connected: false },
  ])
  focus.focus()
  await flushMicrotasks()
  expect(
    requestLines(server).filter(
      (line) => line === `GET ${ACCOUNT_PATHS.account}`,
    ),
  ).toHaveLength(2)
})
