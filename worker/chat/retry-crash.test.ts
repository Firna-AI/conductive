import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import {
  liveSessions,
  retryRequest,
  retryUnavailable,
  sessionRecord,
} from './retry.test-support'
import {
  lifecycleSnapshot,
  messageCommands,
  terminalEvent,
} from './turn-lifecycle.test-support'
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
async function runningFixture() {
  const ids = [
    'session',
    'original-turn',
    'original-command',
    'retry-message',
    'retry-turn',
    'retry-command',
  ]
  const fixture = await createChatFixture(harness, {
    ids,
  })
  const session = await fixture.createSession()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  const { message } = await fixture.send(session.id, 'original')
  const turn = messageCommands(runner, 'original')[0]
  if (turn?.type !== 'turn') throw new Error('The original turn is missing.')
  const gateway = await fixture.chat.store.read(
    WORKSPACE_ID,
    async (view) => (await view.turn(turn.turnId))?.gateway,
  )
  expect(gateway).toEqual({
    nonce: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
    loginVersion: TEST_TIME,
  })
  const failedSession = {
    ...session,
    title: 'Check this code',
    retryMessageId: 'original',
  }
  const failedTurn = {
    id: 'original-turn',
    sessionId: session.id,
    senderId: fixture.owner.id,
    messageIds: ['original'],
    state: 'failed',
    error: { code: 'agent_unavailable', message: 'Try again.' },
    closeAfterStop: false,
    nextTurnId: null,
    started: true,
    startedAt: TEST_TIME,
    gateway,
  }
  const sentMessage = { ...message, state: 'sent' as const }
  return {
    fixture,
    session,
    runner,
    turn,
    failedSession,
    failedTurn,
    sentMessage,
  }
}
it('keeps the full failed receipt after a crash immediately after its commit', async () => {
  const {
    fixture,
    session,
    runner,
    turn,
    failedSession,
    failedTurn,
    sentMessage,
  } = await runningFixture()
  const before = await fixture.history(session.id)
  expect(before.throughEventNumber).toBe(5)
  const tab = await fixture.tab()
  const received = structuredClone(runner.received)
  await fixture.failNextCommit('after', 'Injected post-commit crash')
  const receipt = runner.emit(terminalEvent(turn, 'failed'))
  await expect(fixture.drain()).rejects.toThrow('Injected post-commit crash')
  expect(runner.pendingEvents()).toEqual([receipt])
  expect(runner.received).toEqual(received)
  expect(liveSessions(tab.messages)).toEqual([])
  await fixture.restart()
  expect(await sessionRecord(fixture, session.id)).toEqual(failedSession)
  const expectedState = {
    sessions: [failedSession],
    turns: [failedTurn],
    commands: [],
    messages: [sentMessage],
  }
  expect(await lifecycleSnapshot(fixture)).toEqual(expectedState)
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, async (view) => ({
      cursor: await view.cursor('fake-stream-1'),
      newest: await view.newestTurn(session.id),
      messageTurn: await view.messageTurn('original'),
    })),
  ).toEqual({
    cursor: 2,
    newest: 'original-turn',
    messageTurn: 'original-turn',
  })
  const expectedHistory = {
    throughEventNumber: 7,
    events: [
      ...before.events,
      {
        workspaceId: WORKSPACE_ID,
        eventNumber: 6,
        occurredAt: TEST_TIME,
        event: terminalEvent(turn, 'failed'),
      },
      {
        workspaceId: WORKSPACE_ID,
        eventNumber: 7,
        occurredAt: TEST_TIME,
        event: { type: 'session.updated', session: failedSession },
      },
    ],
  }
  expect(await fixture.history(session.id)).toEqual(expectedHistory)
  await fixture.connect(runner)
  expect(runner.pendingEvents()).toEqual([])
  expect(runner.received.at(-1)).toEqual({
    type: 'welcome',
    protocolVersion: 2,
    streamId: 'fake-stream-1',
    confirmedThrough: 2,
  })
  expect(await lifecycleSnapshot(fixture)).toEqual(expectedState)
  expect(await fixture.history(session.id)).toEqual(expectedHistory)
  await tab.close()
})
it('keeps the full accepted retry after a crash immediately after its commit', async () => {
  const { fixture, session, runner, turn, failedTurn, sentMessage } =
    await runningFixture()
  runner.emit(terminalEvent(turn, 'failed'))
  await fixture.drain()
  const before = await fixture.history(session.id)
  expect(before.throughEventNumber).toBe(7)
  const tab = await fixture.tab()
  await fixture.failNextCommit('after', 'Injected post-commit crash')
  const response = await retryRequest(fixture, session.id, 'original')
  expect(response.status).toBe(500)
  expect(await response.json()).toEqual({
    error: {
      code: 'internal_error',
      message: 'The request failed. Try again.',
    },
  })
  expect(liveSessions(tab.messages)).toEqual([])
  expect(runner.commands).toEqual([turn])
  runner.disconnect()
  await fixture.restart()
  const retrySession = {
    ...session,
    title: 'Check this code',
    activeTurnId: 'retry-turn',
  }
  expect(await sessionRecord(fixture, session.id)).toEqual(retrySession)
  const retryMessage = { ...sentMessage, id: 'retry-message', state: 'queued' }
  const retryTurn = {
    id: 'retry-turn',
    sessionId: session.id,
    senderId: fixture.owner.id,
    messageIds: ['retry-message'],
    state: 'queued',
    closeAfterStop: false,
    nextTurnId: null,
  }
  const retryCommand = {
    type: 'turn',
    commandId: 'retry-command',
    sessionId: session.id,
    turnId: 'retry-turn',
    messageId: 'retry-message',
    attachments: [],
  }
  expect(await lifecycleSnapshot(fixture)).toEqual({
    sessions: [retrySession],
    turns: [failedTurn, retryTurn],
    commands: [retryCommand],
    messages: [sentMessage, retryMessage],
  })
  expect(
    await fixture.chat.store.read(WORKSPACE_ID, async (view) => ({
      cursor: await view.cursor('fake-stream-1'),
      newest: await view.newestTurn(session.id),
      messageTurn: await view.messageTurn('retry-message'),
    })),
  ).toEqual({ cursor: 2, newest: 'retry-turn', messageTurn: 'retry-turn' })
  const expectedHistory = {
    throughEventNumber: 9,
    events: [
      ...before.events,
      {
        workspaceId: WORKSPACE_ID,
        eventNumber: 8,
        occurredAt: TEST_TIME,
        event: { type: 'message.accepted', message: retryMessage },
      },
      {
        workspaceId: WORKSPACE_ID,
        eventNumber: 9,
        occurredAt: TEST_TIME,
        event: { type: 'session.updated', session: retrySession },
      },
    ],
  }
  expect(await fixture.history(session.id)).toEqual(expectedHistory)
  const duplicate = await retryRequest(fixture, session.id, 'original')
  expect(duplicate.status).toBe(409)
  expect(await duplicate.json()).toEqual(retryUnavailable)
  expect(await fixture.history(session.id)).toEqual(expectedHistory)
  await fixture.connect(runner)
  expect(messageCommands(runner, 'retry-message')).toMatchObject([
    {
      type: 'turn',
      commandId: 'retry-command',
      turnId: 'retry-turn',
      message: { id: 'retry-message', state: 'sent' },
    },
  ])
  const dispatched = messageCommands(runner, 'retry-message')[0]
  if (dispatched?.type !== 'turn') throw new Error('The retry turn is missing.')
  expect(dispatched).not.toHaveProperty('login')
  expect(
    await fixture.chat.turnTokens.check(
      WORKSPACE_ID,
      dispatched.credential.token,
    ),
  ).toEqual({
    ok: true,
    login: {
      agent: 'claude',
      kind: 'api-key',
      secret: `secret-${fixture.owner.id}-claude`,
    },
  })
  expect(await lifecycleSnapshot(fixture)).toEqual({
    sessions: [{ ...retrySession, activeTurnStartedAt: TEST_TIME }],
    turns: [
      failedTurn,
      {
        ...retryTurn,
        state: 'running',
        started: true,
        startedAt: TEST_TIME,
        gateway: {
          nonce: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
          loginVersion: TEST_TIME,
        },
      },
    ],
    commands: [retryCommand],
    messages: [sentMessage, { ...retryMessage, state: 'sent' }],
  })
  expect(await fixture.history(session.id)).toEqual({
    throughEventNumber: 10,
    events: [
      ...expectedHistory.events,
      {
        workspaceId: WORKSPACE_ID,
        eventNumber: 10,
        occurredAt: TEST_TIME,
        event: {
          type: 'message.sent',
          sessionId: session.id,
          messageId: 'retry-message',
          turnId: 'retry-turn',
        },
      },
    ],
  })
  await tab.close()
})
