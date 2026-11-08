import { expect, it, vi } from 'vitest'

import { turn } from '../test-support/harness'
import { wireFixture } from '../test-support/wire'

it('rejects a failed output call and accepts a later report', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  const failure = new Error('The event cannot be saved.')
  vi.spyOn(h.runner.link, 'emit').mockRejectedValueOnce(failure)
  await expect(h.runner.files.refresh(true)).rejects.toBe(failure)
  await expect(h.runner.files.refresh(true)).resolves.toBeUndefined()
  expect(
    h.endpoint.runnerEvents.slice(-2).map(({ event }) => event.type),
  ).toEqual(['files.snapshot', 'changes.updated'])
  expect(h.warnings).toEqual([])
})

it('fails the turn after a failed turn.started save and starts the next turn', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  const write = h.storage.write.bind(h.storage)
  let rejected = 0
  vi.spyOn(h.storage, 'write').mockImplementation(async (state) => {
    if (rejected === 0 && state.outbox.at(-1)?.event.type === 'turn.started') {
      rejected++
      throw new Error('The turn start cannot be saved.')
    }
    await write(state)
  })
  h.endpoint.send(turn())
  await h.runner.idle()
  expect(rejected).toBe(1)
  expect(h.providers.processes).toHaveLength(0)
  expect(
    h.endpoint.runnerEvents.slice(3).map(({ event }) => event.type),
  ).toEqual(['turn.started', 'turn.failed'])
  expect(h.endpoint.runnerEvents.at(-1)?.event).toEqual({
    type: 'turn.failed',
    sessionId: 'session-1',
    turnId: 'turn-1',
    error: { code: 'agent_failed', message: 'The turn start cannot be saved.' },
    retryMessageId: 'message-1',
    durationMs: 0,
  })
  h.endpoint.send(turn('next'))
  await h.runner.idle()
  expect(h.providers.latest.messages.map(({ turnId }) => turnId)).toEqual([
    'turn-next',
  ])
  expect(h.warnings).toEqual([])
})

it('saves the terminal part after a held text save fails and never ends that turn twice', async () => {
  const h = await wireFixture()
  await h.runner.start(false)
  h.endpoint.confirmEvents = false
  h.endpoint.send(turn())
  await h.runner.idle()
  const provider = h.providers.latest
  provider.emit({ type: 'delta', messageId: 'held', text: 'secret-' })
  await h.runner.idle()
  const write = h.storage.write.bind(h.storage)
  const failure = new Error('The text cannot be saved.')
  let rejected = 0
  vi.spyOn(h.storage, 'write').mockImplementation(async (state) => {
    const event = state.outbox.at(-1)?.event
    if (rejected === 0 && event?.type === 'assistant.delta') {
      rejected++
      throw failure
    }
    await write(state)
  })
  provider.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  await h.runner.idle()
  expect(rejected).toBe(1)
  expect(
    h.endpoint.runnerEvents
      .filter(
        ({ event }) =>
          event.type === 'turn.completed' || event.type === 'turn.failed',
      )
      .map(({ event }) => event),
  ).toEqual([
    {
      type: 'turn.completed',
      sessionId: 'session-1',
      turnId: 'turn-1',
      state: 'finished',
      durationMs: 0,
      files: [],
      omittedFileCount: 0,
      userMessageIds: ['message-1'],
    },
  ])
  expect(provider.closed).toBe(true)
  expect(h.store.snapshot.outbox.map(({ eventNumber }) => eventNumber)).toEqual(
    [4, 5, 6],
  )
  expect(
    h.store.snapshot.turns.map(({ endEventNumber }) => endEventNumber),
  ).toEqual([6])
  await h.runner.files.refresh(true)
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.map(({ eventNumber }) => eventNumber)).toEqual(
    [1, 2, 3, 4, 5, 6, 7, 8],
  )
  expect(h.warnings).toEqual([
    'The agent output save failed. The turn will continue.',
  ])
})
