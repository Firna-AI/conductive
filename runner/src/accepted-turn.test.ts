import { expect, it, vi } from 'vitest'

import { engineFixture } from '../test-support/engine'
import { deferred, sessionTurn, stop } from '../test-support/runtime'
import { wireFixture } from '../test-support/wire'
import { EventStore } from './state'

it.each(['shutdown', 'Stop', 'crash'])(
  'saves an accepted turn before its session save and ends it once after %s',
  async (end) => {
    const h = await engineFixture()
    const entered = deferred<void>()
    const release = deferred<void>()
    const remember = h.store.remember.bind(h.store)
    vi.spyOn(h.store, 'remember').mockImplementation(async (session) => {
      entered.resolve()
      await release.promise
      await remember(session)
    })
    const command = sessionTurn('pending')
    const starting = h.engine.command(command)
    await entered.promise
    try {
      expect(h.store.snapshot.turns).toEqual([
        {
          sessionId: 'pending',
          turnId: 'turn-pending',
          startedAt: 100,
          messageIds: ['message-pending'],
          startEventNumber: null,
          endEventNumber: null,
        },
      ])
      if (end === 'shutdown') await h.engine.close()
      if (end === 'Stop') await h.engine.command(stop('pending'))
      const store = await EventStore.open(h.storage)
      const restored = await engineFixture({ store })
      await restored.engine.command({ ...command, commandId: 'redelivered' })
      await restored.engine.command(stop('pending', command.turnId, 'repeated'))
      await restored.engine.idle()
      expect(restored.providers.processes).toHaveLength(0)
      expect(
        [...h.events, ...restored.events].map((event) => event.type),
      ).toEqual(['turn.completed'])
      expect(
        store.snapshot.turns.map(({ endEventNumber }) => endEventNumber),
      ).toEqual([1])
      expect(JSON.stringify(await h.storage.read())).not.toContain('login')
    } finally {
      release.resolve()
      await starting
    }
  },
)

it('keeps an unmatched Stop ended after restart and redelivery', async () => {
  const h = await engineFixture()
  const unmatched = stop('pending', 'unknown-turn')
  await Promise.all([
    h.engine.command(unmatched),
    h.engine.command({ ...unmatched, commandId: 'concurrent-redelivery' }),
  ])
  expect(h.events.map((event) => event.type)).toEqual(['turn.completed'])
  const restored = await engineFixture({
    store: await EventStore.open(h.storage),
  })
  await restored.engine.command({
    ...unmatched,
    commandId: 'unmatched-redelivery',
  })
  await restored.engine.command({
    ...sessionTurn('pending'),
    turnId: 'unknown-turn',
  })
  await restored.engine.idle()
  expect(restored.events).toEqual([])
  expect(restored.providers.processes).toEqual([])
  expect(
    restored.store.snapshot.turns.map(({ turnId, endEventNumber }) => [
      turnId,
      endEventNumber,
    ]),
  ).toEqual([['unknown-turn', 1]])
})

it('keeps the active turn running when another accepted turn cannot be saved', async () => {
  const h = await engineFixture()
  await h.engine.command(sessionTurn('session', 'active'))
  const write = h.storage.write.bind(h.storage)
  let failed = false
  vi.spyOn(h.storage, 'write').mockImplementation(async (state) => {
    if (
      !failed &&
      state.turns.some(
        (turn) => turn.turnId === 'turn-other' && turn.endEventNumber === null,
      )
    ) {
      failed = true
      throw new Error('The accepted turn cannot be saved.')
    }
    await write(state)
  })
  await h.engine.command(sessionTurn('session', 'other'))
  expect(h.events.filter((event) => event.type === 'turn.failed')).toEqual([
    {
      type: 'turn.failed',
      sessionId: 'session',
      turnId: 'turn-other',
      error: {
        code: 'agent_failed',
        message: 'The accepted turn cannot be saved.',
      },
      retryMessageId: 'message-other',
      durationMs: 0,
    },
  ])
  expect(h.providers.latest.closed).toBe(false)
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: [],
  })
  await h.engine.idle()
  expect(h.events.at(-1)).toMatchObject({
    type: 'turn.completed',
    turnId: 'turn-active',
    state: 'finished',
  })
})

it.each(['fresh Stop', 'shutdown'])(
  'retries the original pending Stop end with %s while the session save still waits',
  async (recovery) => {
    const h = await wireFixture()
    await h.runner.start(false)
    h.endpoint.confirmEvents = false
    const entered = deferred<void>()
    const release = deferred<void>()
    const remember = h.store.remember.bind(h.store)
    let sessionSave = Promise.resolve()
    let sessionSaved = false
    vi.spyOn(h.store, 'remember').mockImplementation((session) => {
      sessionSave = (async () => {
        entered.resolve()
        await release.promise
        await remember(session)
        sessionSaved = true
      })()
      return sessionSave
    })
    const command = sessionTurn('pending')
    h.endpoint.send(command)
    await entered.promise
    const write = h.storage.write.bind(h.storage)
    let terminalWrites = 0
    vi.spyOn(h.storage, 'write').mockImplementation(async (state) => {
      if (state.outbox.at(-1)?.event.type === 'turn.completed') {
        terminalWrites++
        if (terminalWrites <= 2)
          throw new Error('The pending end cannot be saved.')
      }
      await write(state)
    })
    try {
      const stopping = h.runner.engine.command(stop('pending'))
      const concurrent = h.runner.engine.command(
        stop('pending', command.turnId, 'concurrent'),
      )
      await expect(stopping).rejects.toThrow('The pending end cannot be saved.')
      await concurrent
      await h.runner.idle()
      expect(terminalWrites).toBe(2)
      expect(h.endpoint.runnerEvents.map(({ event }) => event.type)).toEqual([
        'files.snapshot',
        'changes.updated',
        'runner.ready',
      ])
      expect(sessionSaved).toBe(false)
      if (recovery === 'shutdown') await h.runner.close()
      else {
        h.endpoint.send(stop('pending', command.turnId, 'fresh'))
        await h.runner.idle()
      }
      const ends = h.endpoint.runnerEvents.filter(
        ({ event }) => event.type === 'turn.completed',
      )
      expect(ends).toHaveLength(1)
      expect(ends).toEqual([
        {
          type: 'event',
          streamId: h.store.snapshot.streamId,
          eventNumber: 4,
          occurredAt: 100,
          event: {
            type: 'turn.completed',
            sessionId: 'pending',
            turnId: command.turnId,
            state: 'stopped',
            durationMs: 0,
            files: [],
            omittedFileCount: 0,
            userMessageIds: [],
          },
        },
      ])
      expect(terminalWrites).toBe(3)
      expect(sessionSaved).toBe(false)
      expect(h.providers.processes).toEqual([])
      expect(h.store.snapshot.outbox).toEqual(ends)
      expect(
        h.store.snapshot.turns.map(({ startEventNumber, endEventNumber }) => [
          startEventNumber,
          endEventNumber,
        ]),
      ).toEqual([[null, 4]])
    } finally {
      release.resolve()
      await sessionSave
    }
    await h.runner.idle()
    expect(h.providers.processes).toEqual([])
    expect(
      h.endpoint.runnerEvents.map(({ eventNumber }) => eventNumber),
    ).toEqual([1, 2, 3, 4])
  },
)
