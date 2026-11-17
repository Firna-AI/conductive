import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { sessionsPath } from '../../src/shared/sessions'
import { recordUserSuspension } from '../operator/data'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { CLAUDE, createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { captureLoginQueries } from './login-queries.test-support'
import { expectGatewayLogin } from './runner-credential.test-support'
let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => {
  await harness.dispose()
})
it('keeps suspended starter metadata and history readable and sends an active member through a linked session', async () => {
  const fixture = await createChatFixture(harness)
  const suspendedSession = await fixture.createSession(
    CLAUDE,
    fixture.memberCookie,
  )
  const activeSession = await fixture.createSession()
  await recordUserSuspension(harness.env.DB, 8, fixture.owner.id, TEST_TIME)
  const queries = await captureLoginQueries(fixture)
  const tab = await fixture.tab()
  expect(queries).toHaveLength(1)
  expect(queries[0]?.query).not.toMatch(/ciphertext|SELECT\s+\*/i)
  const list = await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
  expect(list.status).toBe(200)
  expect(await list.json()).toMatchObject({
    sessions: [
      {
        id: suspendedSession.id,
        startedBy: { id: fixture.member.id },
        loginAvailable: false,
      },
      {
        id: activeSession.id,
        startedBy: { id: fixture.owner.id },
        loginAvailable: true,
      },
    ],
  })
  expect(
    (await fixture.history(suspendedSession.id)).events.at(-1)?.event,
  ).toMatchObject({
    type: 'session.updated',
    session: { id: suspendedSession.id, loginAvailable: false },
  })
  const linked = await fixture.send(
    suspendedSession.id,
    'after-starter-suspension',
  )
  expect(linked.session).toMatchObject({
    startedBy: { id: fixture.owner.id },
    sourceSessionId: suspendedSession.id,
  })
  expect(linked.message.sessionId).toBe(linked.session.id)
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(runner.commands).toHaveLength(1)
  expect(runner.commands[0]).toMatchObject({
    type: 'turn',
    sessionId: linked.session.id,
    message: { sender: { id: fixture.owner.id } },
  })
  await expectGatewayLogin(
    fixture,
    runner.commands[0],
    `secret-${fixture.owner.id}-claude`,
  )
  expect(JSON.stringify(tab.messages)).not.toContain('secret-')
  await tab.close()
  runner.disconnect()
})
it('refuses a queued suspended sender while the active starter and owner retain their login and runner', async () => {
  const fixture = await createChatFixture(harness)
  const session = await fixture.createSession()
  await fixture.send(
    session.id,
    'queued-before-suspension',
    fixture.memberCookie,
  )
  await recordUserSuspension(harness.env.DB, 8, fixture.owner.id, TEST_TIME)
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(runner.commands).toEqual([])
  expect(fixture.transport.closedConnections).toBe(0)
  const list = await fixture.fetch(sessionsPath(fixture.org.id, WORKSPACE_ID))
  expect(await list.json()).toMatchObject({
    sessions: [
      {
        id: session.id,
        loginAvailable: true,
        activeTurnId: null,
        retryMessageId: 'queued-before-suspension',
      },
    ],
  })
  expect(
    (await fixture.history(session.id)).events.map(({ event }) => event),
  ).toContainEqual(
    expect.objectContaining({
      type: 'turn.failed',
      error: {
        code: 'agent_login_required',
        message: 'The message sender no longer has access to this workspace.',
      },
    }),
  )
  const active = await fixture.send(
    session.id,
    'active-sender-after-suspension',
  )
  expect(active.session.id).toBe(session.id)
  expect(runner.commands).toHaveLength(1)
  expect(runner.commands[0]).toMatchObject({
    message: { sender: { id: fixture.owner.id } },
  })
  await expectGatewayLogin(
    fixture,
    runner.commands[0],
    `secret-${fixture.owner.id}-claude`,
  )
  runner.disconnect()
})
