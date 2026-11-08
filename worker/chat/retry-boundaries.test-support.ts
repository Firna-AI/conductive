import { expect } from 'vitest'

import type { TestHarness } from '../test-support/harness'
import { checkCommitBoundaries } from './commit-boundary.test-support'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import {
  liveSessions,
  retryRequest,
  retryUnavailable,
  sessionRecord,
} from './retry.test-support'
import { startTurn, terminalEvent } from './turn-lifecycle.test-support'

const initialTypes = [
  'session.updated',
  'message.accepted',
  'session.updated',
  'message.sent',
  'turn.started',
]

export async function checkRetryBoundaries(
  harness: TestHarness,
  phase: 'failure' | 'retry',
): Promise<void> {
  await checkCommitBoundaries(async () => {
    await harness.reset()
    const ids = [
      'session',
      'turn',
      'command',
      'retry',
      'retry-turn',
      'retry-command',
      'confirmed-retry',
      'confirmed-retry-turn',
      'confirmed-retry-command',
    ]
    const fixture = await createChatFixture(harness, {
      randomId: () => {
        const id = ids.shift()
        if (!id) throw new Error('The test ID sequence is empty.')
        return id
      },
    })
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const active = await startTurn(fixture, runner, session.id, 'atomic')
    if (phase === 'retry') {
      runner.emit(terminalEvent(active, 'failed'))
      await fixture.drain()
    }
    const tab = await fixture.tab()
    const read = async () =>
      fixture.chat.store.read(WORKSPACE_ID, async (view) => {
        const stored = await sessionRecord(fixture, session.id)
        const turns = await view.turns()
        const messages = await Promise.all(
          ['atomic', 'retry'].map((id) => view.message(id)),
        )
        const history = await fixture.history(session.id)
        return {
          activeTurnId: stored.activeTurnId,
          retryMessageId: stored.retryMessageId,
          turnStates: turns.map((turn) => [turn.id, turn.state]),
          messageStates: messages.map((message) => message?.state ?? null),
          commands: (await view.pending()).map((command) => command.commandId),
          cursor: await view.cursor('fake-stream-1'),
          through: history.throughEventNumber,
          events: history.events.map(({ event }) => event.type),
        }
      })
    const running = {
      activeTurnId: 'turn',
      retryMessageId: null,
      turnStates: [['turn', 'running']],
      messageStates: ['sent', null],
      commands: [],
      cursor: 2,
      through: 5,
      events: initialTypes,
    }
    const failed = {
      activeTurnId: null,
      retryMessageId: 'atomic',
      turnStates: [['turn', 'failed']],
      messageStates: ['sent', null],
      commands: [],
      cursor: 3,
      through: 7,
      events: [...initialTypes, 'turn.failed', 'session.updated'],
    }
    const accepted = {
      activeTurnId: 'retry-turn',
      retryMessageId: null,
      turnStates: [
        ['retry-turn', 'queued'],
        ['turn', 'failed'],
      ],
      messageStates: ['sent', 'queued'],
      commands: ['retry-command'],
      cursor: 3,
      through: 9,
      events: [
        ...initialTypes,
        'turn.failed',
        'session.updated',
        'message.accepted',
        'session.updated',
      ],
    }
    const acceptedCount = async () => {
      expect(
        (await fixture.history(session.id)).events.filter(
          ({ event }) => event.type === 'message.accepted',
        ),
      ).toHaveLength(2)
      expect(
        (await sessionRecord(fixture, session.id)).retryMessageId,
      ).toBeNull()
    }
    const retrySuccessfully = async (
      before: readonly (string | null)[],
      after: readonly (string | null)[],
    ) => {
      const resumed = await fixture.tab()
      await fixture.connect(runner)
      expect(runner.pendingEvents()).toEqual([])
      expect((await sessionRecord(fixture, session.id)).retryMessageId).toBe(
        'atomic',
      )
      expect(
        liveSessions(resumed.messages).map((record) => record.retryMessageId),
      ).toEqual(before)
      const response = await retryRequest(fixture, session.id, 'atomic')
      expect(response.status).toBe(202)
      expect(
        liveSessions(resumed.messages).map((record) => record.retryMessageId),
      ).toEqual(after)
      await acceptedCount()
      resumed.close()
    }
    const committedRetry = async () => {
      const resumed = await fixture.tab()
      await fixture.connect(runner)
      expect(runner.pendingEvents()).toEqual([])
      const response = await retryRequest(fixture, session.id, 'atomic')
      expect(response.status).toBe(409)
      expect(await response.json()).toEqual(retryUnavailable)
      expect(liveSessions(resumed.messages)).toEqual([])
      await acceptedCount()
      resumed.close()
    }
    const actions = {
      failure: async (error: string) => {
        runner.emit(terminalEvent(active, 'failed'))
        await expect(fixture.drain()).rejects.toThrow(error)
      },
      retry: async () => {
        const response = await retryRequest(fixture, session.id, 'atomic')
        expect(response.status).toBe(500)
        expect(await response.json()).toEqual({
          error: {
            code: 'internal_error',
            message: 'The request failed. Try again.',
          },
        })
      },
    }
    return {
      storage: fixture.storage,
      before: phase === 'failure' ? running : failed,
      after: phase === 'failure' ? failed : accepted,
      read,
      action: actions[phase],
      unpublished: () => {
        expect(liveSessions(tab.messages)).toEqual([])
        expect(runner.commands).toEqual([active])
        tab.close()
      },
      restart: () => {
        runner.disconnect()
        fixture.restart()
      },
      verify:
        phase === 'failure'
          ? {
              rejected: () => retrySuccessfully(['atomic'], ['atomic', null]),
              committed: () => retrySuccessfully([], [null]),
            }
          : {
              rejected: () => retrySuccessfully([], [null]),
              committed: committedRetry,
            },
    }
  })
}
