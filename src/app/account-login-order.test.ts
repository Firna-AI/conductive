import { expect, test } from 'vitest'
import {
  ACCOUNT_PATHS,
  agentLoginPath,
  codexDevicePath,
} from '../shared/account'
import { FakeApiServer } from '../test-support/fake-api'
import { FAKE_TIME } from '../test-support/fixtures/core'
import { AppModel } from './app-model'
import {
  codexLogin,
  serveLoginStatus,
  startedLoginOwner,
} from './login-status.test-support'
import {
  flushMicrotasks,
  HeldRequests,
  requestLines,
  testServices,
} from './test-kit'

const connected = {
  agent: 'codex',
  connected: true,
  kind: 'token',
  noReuse: true,
  updatedAt: FAKE_TIME,
} as const

async function startedPoll() {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const app = new AppModel(testServices(server, { fetch: held.fetch }))
  await app.start()
  const path = codexDevicePath('held-sign-in')
  server.json('POST', path, { state: 'connected', login: connected })
  held.holdAnswer('POST', path)
  const from = server.requests.length
  const poll = app.account.pollCodexSignIn('held-sign-in')
  await flushMicrotasks()
  return { app, server, held, path, from, poll }
}

test('a remove waits for its earlier sign-in poll and keeps Codex removed while Claude remains independent', async () => {
  const { app, server, held, path, from, poll } = await startedPoll()
  const remove = app.account.removeLogin('codex')
  const otherRemove = app.account.removeLogin('claude')
  await flushMicrotasks()
  const beforePollReply = requestLines(server).slice(from)
  const otherLogin = app.account.login('claude')
  held.release('POST', path)
  await Promise.all([poll, remove, otherRemove])
  expect({
    beforePollReply,
    otherLogin,
    requests: requestLines(server).slice(from),
    login: app.account.login('codex'),
  }).toEqual({
    beforePollReply: [`POST ${path}`, `DELETE ${agentLoginPath('claude')}`],
    otherLogin: { agent: 'claude', connected: false },
    requests: [
      `POST ${path}`,
      `DELETE ${agentLoginPath('claude')}`,
      `DELETE ${agentLoginPath('codex')}`,
    ],
    login: { agent: 'codex', connected: false },
  })
})

test('a share change waits for its earlier sign-in poll and keeps the last share choice', async () => {
  const { app, server, held, path, from, poll } = await startedPoll()
  const shared = { ...connected, noReuse: false }
  server.json('PATCH', agentLoginPath('codex'), shared)
  const share = app.account.setNoReuse('codex', false)
  await flushMicrotasks()
  const beforePollReply = requestLines(server).slice(from)
  held.release('POST', path)
  await Promise.all([poll, share])
  expect({
    beforePollReply,
    requests: requestLines(server).slice(from),
    login: app.account.login('codex'),
  }).toEqual({
    beforePollReply: [`POST ${path}`],
    requests: [`POST ${path}`, `PATCH ${agentLoginPath('codex')}`],
    login: shared,
  })
})

test('a failed sign-in poll rejects its caller and lets the queued remove complete', async () => {
  const server = new FakeApiServer()
  const held = new HeldRequests(server)
  const app = new AppModel(testServices(server, { fetch: held.fetch }))
  await app.start()
  const path = codexDevicePath('failed-sign-in')
  server.json(
    'POST',
    path,
    { error: { code: 'internal_error', message: 'Try again.' } },
    503,
  )
  held.holdAnswer('POST', path)
  const from = server.requests.length
  const poll = app.account.pollCodexSignIn('failed-sign-in')
  const rejected = expect(poll).rejects.toMatchObject({
    status: 503,
    code: 'internal_error',
  })
  const remove = app.account.removeLogin('codex')
  await flushMicrotasks()
  const beforePollReply = requestLines(server).slice(from)
  held.release('POST', path)
  await rejected
  await expect(remove).resolves.toBeUndefined()
  expect({ beforePollReply, login: app.account.login('codex') }).toEqual({
    beforePollReply: [`POST ${path}`],
    login: { agent: 'codex', connected: false },
  })
})

test('an earlier account read waiting in the queue cannot confirm a later save before its complete reply', async () => {
  const { app, server, held, observation } = await startedLoginOwner()
  const path = codexDevicePath('waiting-sign-in')
  server.json('POST', path, { state: 'waiting', pollIntervalMs: 5_000 })
  held.holdAnswer('POST', path)
  const from = server.requests.length
  const poll = app.account.pollCodexSignIn('waiting-sign-in')
  await flushMicrotasks()
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  held.holdAnswer('GET', ACCOUNT_PATHS.account)
  app.account.observeLogin(observation)
  const read = app.account.refreshLogins()
  const saved = {
    ...codexLogin,
    kind: 'api-key',
    updatedAt: FAKE_TIME + 1,
  } as const
  server.json('PUT', agentLoginPath('codex'), saved)
  const save = app.account.saveLogin({
    agent: 'codex',
    kind: 'api-key',
    secret: 'new-test-key',
  })
  serveLoginStatus(server, 'failed', 'org', saved)
  held.release('POST', path)
  await flushMicrotasks()
  const beforeReadReply = requestLines(server).slice(from)
  held.release('GET', ACCOUNT_PATHS.account)
  await flushMicrotasks()
  const partial = {
    current: app.account.loginObservationCurrent(observation),
    login: app.account.login('codex'),
  }
  held.release('GET', ACCOUNT_PATHS.account)
  await Promise.all([poll, read, save])
  expect({
    beforeReadReply,
    partial,
    current: app.account.loginObservationCurrent(observation),
    login: app.account.login('codex'),
  }).toEqual({
    beforeReadReply: [`POST ${path}`, `GET ${ACCOUNT_PATHS.account}`],
    partial: { current: false, login: saved },
    current: true,
    login: { ...saved, unusableCause: 'refresh_denied' },
  })
})
