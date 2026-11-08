import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'

import { agentLoginPath } from '../../src/shared/account'
import { createHarness, type TestHarness } from '../test-support/harness'
import { CODEX, createChatFixture } from './harness.test-support'
import { readAgentLogin } from './queries'
import { retryRequest, sessionRecord } from './retry.test-support'
import { messageCommands, startTurn } from './turn-lifecycle.test-support'

let harness: TestHarness
beforeAll(async () => {
  harness = await createHarness()
})
beforeEach(async () => {
  await harness.reset()
})
afterAll(async () => harness.dispose())

it('keeps the starter login available and sends another member to an empty linked session when reuse is disabled', async () => {
  let refuseDuringRead = false
  const fixture = await createChatFixture(harness, {
    resolveLogin: async (userId, agent) => {
      if (userId === null) return null
      if (refuseDuringRead) {
        refuseDuringRead = false
        await harness.env.DB.prepare(
          'UPDATE agent_logins SET no_reuse = 1 WHERE user_id = ? AND agent = ?',
        )
          .bind(userId, agent)
          .run()
      }
      return readAgentLogin(harness.env, userId, agent)
    },
  })
  const source = await fixture.createSession()
  await harness.env.DB.prepare(
    "UPDATE agent_logins SET no_reuse = 1 WHERE user_id = ? AND agent = 'claude'",
  )
    .bind(fixture.owner.id)
    .run()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const original = await startTurn(fixture, runner, source.id, 'starter')
  expect(await sessionRecord(fixture, source.id)).toMatchObject({
    loginAvailable: true,
    loginShared: false,
  })
  runner.emit({
    type: 'assistant.delta',
    sessionId: source.id,
    turnId: original.turnId,
    messageId: 'source-answer',
    text: 'Private source conversation',
  })
  await fixture.drain()
  const linked = await fixture.send(source.id, 'member', fixture.memberCookie)
  expect(linked.session.id).not.toBe(source.id)
  expect(linked.session).toMatchObject({
    sourceSessionId: source.id,
    startedBy: { id: fixture.member.id },
    loginAvailable: true,
    loginShared: true,
  })
  expect(messageCommands(runner, 'member')).toMatchObject([
    {
      type: 'turn',
      sessionId: linked.session.id,
      login: { secret: `secret-${fixture.member.id}-claude` },
    },
  ])
  expect(
    JSON.stringify(await fixture.history(linked.session.id)),
  ).not.toContain('Private source conversation')
  expect(await sessionRecord(fixture, source.id)).toMatchObject({
    loginAvailable: true,
    loginShared: false,
    activeTurnId: original.turnId,
  })
  await harness.env.DB.prepare(
    "UPDATE agent_logins SET no_reuse = 0 WHERE user_id = ? AND agent = 'claude'",
  )
    .bind(fixture.owner.id)
    .run()
  const refreshed = await fixture.tab(0, undefined, fixture.memberCookie)
  refreshed.close()
  expect(await sessionRecord(fixture, source.id)).toMatchObject({
    loginShared: true,
  })
  refuseDuringRead = true
  const changedDuringRead = await fixture.send(
    source.id,
    'changed-during-read',
    fixture.memberCookie,
  )
  expect(changedDuringRead.session.id).not.toBe(source.id)
  expect(changedDuringRead.session).toMatchObject({
    sourceSessionId: source.id,
    startedBy: { id: fixture.member.id },
  })
  const codex = await fixture.createSession(CODEX)
  const shared = await fixture.send(
    codex.id,
    'codex-member',
    fixture.memberCookie,
    CODEX,
  )
  expect(shared.session.id).toBe(codex.id)
  expect(messageCommands(runner, 'codex-member')).toMatchObject([
    { login: { secret: `secret-${fixture.owner.id}-codex` } },
  ])
})

it('checks a changed reuse preference before queued dispatch and permits a linked retry on the sender login', async () => {
  const fixture = await createChatFixture(harness)
  const source = await fixture.createSession()
  await fixture.send(source.id, 'queued-member', fixture.memberCookie)
  await harness.env.DB.prepare(
    "UPDATE agent_logins SET no_reuse = 1 WHERE user_id = ? AND agent = 'claude'",
  )
    .bind(fixture.owner.id)
    .run()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(messageCommands(runner, 'queued-member')).toEqual([])
  expect(
    (await fixture.history(source.id)).events.map(({ event }) => event),
  ).toContainEqual(
    expect.objectContaining({
      type: 'turn.failed',
      error: {
        code: 'agent_login_required',
        message:
          "Octocat's Claude login is for Octocat's messages only. Try again or send a new message.",
      },
    }),
  )
  expect(await sessionRecord(fixture, source.id)).toMatchObject({
    loginAvailable: true,
    loginShared: false,
    activeTurnId: null,
    retryMessageId: 'queued-member',
  })
  const retried = await retryRequest(
    fixture,
    source.id,
    'queued-member',
    fixture.memberCookie,
  )
  expect(retried.status).toBe(202)
  expect(await retried.json()).toMatchObject({
    session: {
      sourceSessionId: source.id,
      startedBy: { id: fixture.member.id },
    },
  })
  const allowed = await harness.request(
    agentLoginPath('claude'),
    fixture.ownerCookie,
    {
      method: 'PATCH',
      body: JSON.stringify({ noReuse: false }),
    },
  )
  expect(allowed.status).toBe(200)
  const shared = await fixture.send(
    source.id,
    'shared-again',
    fixture.memberCookie,
  )
  expect(shared.session.id).toBe(source.id)
  expect(shared.session).toMatchObject({
    loginAvailable: true,
    loginShared: true,
  })
  expect(messageCommands(runner, 'shared-again')).toMatchObject([
    { login: { secret: `secret-${fixture.owner.id}-claude` } },
  ])
})
