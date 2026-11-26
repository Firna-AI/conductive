import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { sessionsPath } from '../../src/shared/sessions'
import {
  createHarness,
  TEST_TIME,
  type TestHarness,
} from '../test-support/harness'
import { activeTurnMismatch } from './active-turn-check'
import { createChatFixture, WORKSPACE_ID } from './harness.test-support'
import { startTurn } from './turn-lifecycle.test-support'
import type { StoredTurn } from './types'

function stored(state: StoredTurn['state'], startedAt?: number): StoredTurn {
  return {
    id: 'turn-1',
    sessionId: 'session-1',
    senderId: 'member-1',
    messageIds: [],
    state,
    closeAfterStop: false,
    ...(startedAt === undefined ? {} : { startedAt }),
  }
}

describe('activeTurnMismatch', () => {
  const listed = new Set(['turn-1'])
  const unlisted = new Set<string>()
  it.each([
    ['a running turn in the running list', stored('running', 1), listed, null],
    [
      'a stopping turn in the running list',
      stored('stopping', 1),
      listed,
      null,
    ],
    ['a queued turn before its start', stored('queued'), unlisted, null],
    ['no stored turn', undefined, listed, 'missing'],
    ['a finished turn', stored('finished', 1), unlisted, 'ended'],
    ['a stopped turn', stored('stopped', 1), unlisted, 'ended'],
    ['a failed turn', stored('failed', 1), unlisted, 'ended'],
    [
      'a queued turn with a start',
      stored('queued', 1),
      unlisted,
      'queued_started',
    ],
    [
      'a running turn out of the running list',
      stored('running', 1),
      unlisted,
      'not_in_running_list',
    ],
  ] as const)(
    'gives the expected mismatch for %s',
    (_name, turn, running, expected) => {
      expect(activeTurnMismatch(turn, running)).toBe(expected)
    },
  )
})

describe('the session list', () => {
  let harness: TestHarness
  beforeAll(async () => {
    harness = await createHarness()
  })
  beforeEach(() => harness.reset())
  afterAll(() => harness.dispose())
  afterEach(() => vi.restoreAllMocks())

  it('warns about a session whose active turn ended, and changes no record', async () => {
    const fixture = await createChatFixture(harness)
    const session = await fixture.createSession()
    const runner = await fixture.connect()
    runner.emit({ type: 'runner.ready' })
    await fixture.drain()
    const turn = await startTurn(fixture, runner, session.id, 'message-1')
    const list = async () => {
      const response = await fixture.fetch(
        sessionsPath(fixture.org.id, WORKSPACE_ID),
      )
      const body = (await response.json()) as {
        sessions: { id: string; activeTurnId: string | null }[]
      }
      return body.sessions.map(({ id, activeTurnId }) => ({ id, activeTurnId }))
    }
    await fixture.actor.api.controls.captureWarnings(true)
    try {
      await list()
      const whileRunning = await fixture.actor.api.controls.warningCalls()
      await fixture.changeWorkspace(WORKSPACE_ID, async (transaction) => {
        const ended = await transaction.turn(turn.turnId)
        if (!ended) throw new Error('The turn is not stored.')
        await transaction.saveTurn({ ...ended, state: 'finished' })
      })

      const listed = await list()

      expect(whileRunning).toEqual([])
      expect(listed).toEqual([{ id: session.id, activeTurnId: turn.turnId }])
      expect(await fixture.actor.api.controls.warningCalls()).toEqual([
        [
          {
            kind: 'session_active_turn_not_running',
            message:
              'A session names an active turn that the workspace does not count as running.',
            workspaceId: 'unknown',
            sessionId: 'unknown',
            turnId: 'unknown',
            reason: 'ended',
            turnState: 'finished',
            startedAt: TEST_TIME,
          },
        ],
      ])
    } finally {
      await fixture.actor.api.controls.captureWarnings(false)
      await fixture.chat.closeConnections()
    }
  })
})
