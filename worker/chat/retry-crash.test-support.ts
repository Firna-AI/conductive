import { expect } from 'vitest'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { messageCommands } from './turn-lifecycle.test-support'

export async function createRunningRetryFixture(harness: TestHarness) {
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
    login: { type: 'personal', userId: fixture.owner.id },
    title: 'Check this code',
    retryMessageId: 'original',
  }
  delete failedSession.defaultLogin
  const failedTurn = {
    id: 'original-turn',
    sessionId: session.id,
    senderId: fixture.owner.id,
    messageIds: ['original'],
    state: 'failed',
    error: { code: 'agent_unavailable', message: 'Try again.' },
    closeAfterStop: false,
    stopRequest: null,
    nextTurnId: null,
    started: true,
    startedAt: TEST_TIME,
    chainStartedAt: TEST_TIME,
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
