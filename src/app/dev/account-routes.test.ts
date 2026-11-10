import { expect, it } from 'vitest'

import {
  ACCOUNT_PATHS,
  agentLoginPath,
  codexDevicePath,
} from '../../shared/account'
import { FakeApiServer } from '../../test-support/fake-api'
import { FAKE_TIME } from '../../test-support/fixtures/core'
import { readCodexDeviceStart } from '../api/read-core'
import { accountRoutes } from './account-routes'
import { createBackend, guardScope } from './backend'
import { readDevOptions } from './options'
import { routeFetch } from './router'
import { seedState } from './seed'

it('answers finished device polls with current login status without restoring an older login', async () => {
  const server = new FakeApiServer()
  let now = FAKE_TIME
  const backend = createBackend(
    seedState(readDevOptions('?login=none')),
    server.events,
    () => now,
    () => 'unused',
  )
  const fetch = routeFetch(
    accountRoutes(backend),
    (path, method) => guardScope(backend.state, path, method),
    server.fetch,
  )
  const request = (path: string, method = 'POST', body: unknown = {}) =>
    fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  const started = await request(ACCOUNT_PATHS.codexDevice)
  const { handle } = readCodexDeviceStart(await started.json())
  const poll = async () => (await request(codexDevicePath(handle))).json()
  expect(await poll()).toEqual({ state: 'waiting', pollIntervalMs: 5000 })
  const connected = {
    agent: 'codex',
    connected: true,
    kind: 'token',
    noReuse: true,
    updatedAt: FAKE_TIME,
  }
  expect(await poll()).toEqual({ state: 'connected', login: connected })
  expect(
    (await request(agentLoginPath('codex'), 'PATCH', { noReuse: false }))
      .status,
  ).toBe(200)
  expect(await poll()).toEqual({
    state: 'connected',
    login: { ...connected, noReuse: false },
  })
  backend.state.account = {
    ...backend.state.account,
    agentLogins: backend.state.account.agentLogins.map((login) =>
      login.agent === 'codex' && login.connected
        ? { ...login, unusableCause: 'ChatGPT access expired.' }
        : login,
    ),
  }
  expect(await poll()).toEqual({
    state: 'connected',
    login: {
      ...connected,
      noReuse: false,
      unusableCause: 'ChatGPT access expired.',
    },
  })
  now += 20_000
  expect(
    (
      await request(agentLoginPath('codex'), 'PUT', {
        agent: 'codex',
        kind: 'api-key',
        secret: 'replacement-api-key',
      })
    ).status,
  ).toBe(200)
  expect(await poll()).toEqual({
    state: 'connected',
    login: {
      agent: 'codex',
      connected: true,
      kind: 'api-key',
      noReuse: false,
      updatedAt: FAKE_TIME + 20_000,
    },
  })
  expect((await request(agentLoginPath('codex'), 'DELETE')).status).toBe(204)
  expect(await poll()).toEqual({
    state: 'connected',
    login: { agent: 'codex', connected: false },
  })
  expect(
    backend.state.account.agentLogins.find((login) => login.agent === 'codex'),
  ).toEqual({ agent: 'codex', connected: false })
})
