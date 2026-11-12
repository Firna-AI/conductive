import { expect, it, vi } from 'vitest'

import { parseAgentEvent } from './agent-events'
import { createRunnerLimitsFixture } from './runner-limits.test-support'
import { choice, context } from './runner-fixtures.test-support'

const completed = {
  ...context,
  type: 'turn.completed',
  state: 'finished',
  durationMs: 1,
  files: [],
  omittedFileCount: 0,
  userMessageIds: [],
}

it('stores and replays speed once after restart while dropping untrusted extra fields', async () => {
  const h = await createRunnerLimitsFixture()
  await h.receive(1, {
    ...completed,
    state: 'stopped',
    speed: { state: 'standard', cause: 'out_of_credits', raw: 'secret' },
  })
  await h.connect('stream', true)
  await h.receive(1, { ...completed, speed: { state: 'fast' } })
  const ends = (await h.history()).events.filter(
    ({ event }) => event.type === 'turn.completed',
  )
  expect(ends.map(({ event }) => event)).toEqual([
    {
      ...completed,
      state: 'stopped',
      speed: { state: 'standard', cause: 'out_of_credits' },
    },
  ])
})

it('uses the turn messages for the older runner cause after the session choice changes', async () => {
  const h = await createRunnerLimitsFixture()
  await h.store.change(
    'workspace',
    async (transaction) => {
      await transaction.saveMessage({
        id: 'fast-message',
        sessionId: context.sessionId,
        sender: {
          id: 'sender',
          githubLogin: 'sender',
          displayName: null,
          avatarUrl: null,
        },
        text: 'Run fast',
        attachments: [],
        choice: { ...choice, fast: true },
        createdAt: 25,
        state: 'sent',
      })
      const turn = await transaction.turn(context.turnId)
      if (!turn) throw new Error('Missing fixture turn')
      await transaction.saveTurn({ ...turn, messageIds: ['fast-message'] })
    },
    () => undefined,
  )
  await h.receive(1, { ...completed, userMessageIds: ['fast-message'] })
  expect((await h.history()).events.map(({ event }) => event)).toContainEqual({
    ...completed,
    userMessageIds: ['fast-message'],
    speed: { state: 'standard', cause: 'older_runner' },
  })
})

it('keeps the reported speed and reads a malformed speed as standard speed at the event boundary', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  expect(parseAgentEvent({ ...completed, speed: { state: 'fast' } })).toEqual({
    ...completed,
    speed: { state: 'fast' },
  })
  expect(
    parseAgentEvent({
      ...completed,
      speed: { state: 'standard', cause: 'future_cause' },
    }),
  ).toEqual({
    ...completed,
    speed: { state: 'standard', cause: 'future_cause' },
  })
  expect(parseAgentEvent({ ...completed, speed: { state: 'turbo' } })).toEqual({
    ...completed,
    speed: { state: 'standard' },
  })
  expect(
    parseAgentEvent({
      ...completed,
      speed: { state: 'standard', cause: 'display text' },
    }),
  ).toEqual({ ...completed, speed: { state: 'standard' } })
  expect(warn).toHaveBeenCalledTimes(2)
  expect(warn).toHaveBeenCalledWith(
    expect.objectContaining({ kind: 'turn_speed_invalid' }),
  )
  warn.mockRestore()
})
