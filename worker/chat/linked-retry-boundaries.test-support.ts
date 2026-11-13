import { expect } from 'vitest'
import type { TestHarness } from '../test-support/harness'
import { TEST_TIME } from '../test-support/harness'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import {
  retryRequest,
  retryUnavailable,
  sessionRecord,
} from './retry.test-support'
export async function linkedRetryBoundaryFixture(harness: TestHarness) {
  await harness.reset()
  const ids = [
    'source',
    'source-turn',
    'source-command',
    'retry-message',
    'linked',
    'linked-turn',
    'linked-command',
  ]
  const fixture = await createChatFixture(harness, {
    ids,
  })
  await fixture.createSession()
  await fixture.send('source', 'queued')
  await harness.env.DB.prepare('DELETE FROM agent_logins WHERE user_id = ?')
    .bind(fixture.owner.id)
    .run()
  const runner = await fixture.connect()
  runner.emit({ type: 'runner.ready' })
  await fixture.drain()
  expect(await sessionRecord(fixture, 'source')).toMatchObject({
    loginAvailable: false,
    activeTurnId: null,
    retryMessageId: 'queued',
  })
  expect(runner.commands).toEqual([])
  const read = () =>
    fixture.chat.store.read(WORKSPACE_ID, async (view) => ({
      session: await view.session('linked'),
      message: await view.message('retry-message'),
      turn: await view.turn('linked-turn'),
      commands: await view.pending(),
      source: await view.session('source'),
      messageSource: await view.messageSource('retry-message'),
      messageTurn: await view.messageTurn('retry-message'),
      newestTurn: await view.newestTurn('linked'),
      history: (await view.history(0)).events.map(({ event }) => event.type),
    }))
  const after = {
    session: {
      id: 'linked',
      workspaceId: WORKSPACE_ID,
      title: 'Check this code',
      choice: {
        agent: 'claude',
        model: 'test-claude',
        effort: 'high',
        fast: false,
      },
      createdAt: TEST_TIME,
      closedAt: null,
      activeTurnId: 'linked-turn',
      activeTurnStartedAt: null,
      retryMessageId: null,
      startedBy: {
        id: fixture.member.id,
        githubLogin: 'teammate',
        displayName: 'Teammate',
        avatarUrl: null,
      },
      sourceSessionId: 'source',
      loginAvailable: true,
      loginShared: true,
    },
    message: {
      id: 'retry-message',
      sessionId: 'linked',
      text: 'Check this code',
      sender: {
        id: fixture.member.id,
        githubLogin: 'teammate',
        displayName: 'Teammate',
        avatarUrl: null,
      },
      attachments: [],
      choice: {
        agent: 'claude',
        model: 'test-claude',
        effort: 'high',
        fast: false,
      },
      createdAt: TEST_TIME,
      state: 'queued',
    },
    turn: {
      id: 'linked-turn',
      sessionId: 'linked',
      senderId: fixture.member.id,
      messageIds: ['retry-message'],
      state: 'queued',
      closeAfterStop: false,
      nextTurnId: null,
    },
    commands: [
      {
        type: 'turn',
        commandId: 'linked-command',
        sessionId: 'linked',
        turnId: 'linked-turn',
        messageId: 'retry-message',
        attachments: [],
      },
    ],
    source: {
      id: 'source',
      workspaceId: WORKSPACE_ID,
      title: 'Check this code',
      choice: {
        agent: 'claude',
        model: 'test-claude',
        effort: 'high',
        fast: false,
      },
      createdAt: TEST_TIME,
      closedAt: null,
      activeTurnId: null,
      activeTurnStartedAt: null,
      retryMessageId: null,
      startedBy: {
        id: fixture.owner.id,
        githubLogin: 'octocat',
        displayName: 'Octocat',
        avatarUrl: null,
      },
      sourceSessionId: null,
      loginAvailable: false,
      loginShared: false,
    },
    messageSource: 'source',
    messageTurn: 'linked-turn',
    newestTurn: 'linked-turn',
    history: [
      'session.updated',
      'message.accepted',
      'session.updated',
      'skills.updated',
      'session.updated',
      'turn.failed',
      'session.updated',
      'session.updated',
      'message.accepted',
      'session.updated',
      'session.updated',
    ],
  }
  return {
    failNextCommit: fixture.failNextCommit,
    clearFaults: fixture.clearFaults,
    read,
    before: {
      session: undefined,
      message: undefined,
      turn: undefined,
      commands: [],
      source: { ...after.source, retryMessageId: 'queued' },
      messageSource: undefined,
      messageTurn: undefined,
      newestTurn: undefined,
      history: [
        'session.updated',
        'message.accepted',
        'session.updated',
        'skills.updated',
        'session.updated',
        'turn.failed',
        'session.updated',
      ],
    },
    after,
    action: async () => {
      const response = await retryRequest(
        fixture,
        'source',
        'queued',
        fixture.memberCookie,
      )
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({
        error: {
          code: 'internal_error',
          message: 'The request failed. Try again.',
        },
      })
    },
    restart: async () => {
      runner.disconnect()
      await fixture.restart()
    },
    verify: {
      rejected: async () => {
        expect((await sessionRecord(fixture, 'source')).retryMessageId).toBe(
          'queued',
        )
      },
      committed: async () => {
        const duplicate = await retryRequest(
          fixture,
          'source',
          'queued',
          fixture.memberCookie,
        )
        expect(duplicate.status).toBe(409)
        expect(await duplicate.json()).toEqual(retryUnavailable)
        expect(await sessionRecord(fixture, 'source')).toEqual(after.source)
      },
    },
  }
}
