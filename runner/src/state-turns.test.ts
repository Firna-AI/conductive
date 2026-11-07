import { expect, it, onTestFinished } from 'vitest'

import type { AgentChatEvent } from '../../src/shared/chat-events'
import { engineFixture } from '../test-support/engine'
import {
  deferred,
  sessionTurn,
  startEvent,
  stoppedEvent,
  stop,
} from '../test-support/runtime'
import { AgentEngine } from './engine'
import { EventStore, type RunnerState } from './state'

it('commits each turn record with its start and end envelope and drops it only with the end confirmation', async () => {
  let saved: RunnerState | null = null
  let hold = false
  let arrived = deferred<RunnerState>()
  let release = deferred<void>()
  const writes: RunnerState[] = []
  const store = await EventStore.open({
    read: async () => saved,
    write: async (value) => {
      writes.push(structuredClone(value))
      if (hold) {
        arrived.resolve(value)
        await release.promise
      }
      saved = structuredClone(value)
    },
  })
  const record = {
    sessionId: 'saved',
    turnId: 'turn-saved',
    startedAt: 100,
    messageIds: ['message-saved'],
    startEventNumber: 1,
    endEventNumber: null,
  }
  hold = true
  const started = store.append(startEvent(), 100)
  const pendingStart = await arrived.promise
  try {
    expect(store.snapshot.turns).toEqual([])
    expect(store.snapshot.outbox).toEqual([])
    expect(pendingStart.turns).toEqual([record])
    expect(pendingStart.outbox.map(({ event }) => event)).toEqual([
      startEvent(),
    ])
  } finally {
    release.resolve()
    await started
    hold = false
  }
  expect(writes).toHaveLength(2)
  await store.confirm(1)
  expect(store.snapshot.turns).toEqual([record])
  expect(store.snapshot.outbox).toEqual([])
  arrived = deferred()
  release = deferred()
  hold = true
  const ended = store.append(stoppedEvent(), 100)
  const pendingEnd = await arrived.promise
  try {
    expect(store.snapshot.turns).toEqual([record])
    expect(store.snapshot.outbox).toEqual([])
    expect(pendingEnd.turns).toEqual([{ ...record, endEventNumber: 2 }])
    expect(pendingEnd.outbox.map(({ event }) => event)).toEqual([
      stoppedEvent(),
    ])
  } finally {
    release.resolve()
    await ended
    hold = false
  }
  expect(writes).toHaveLength(4)
  arrived = deferred()
  release = deferred()
  hold = true
  const confirming = store.confirm(2)
  const pendingConfirm = await arrived.promise
  try {
    expect(store.snapshot.turns).toEqual([{ ...record, endEventNumber: 2 }])
    expect(store.snapshot.outbox.map(({ event }) => event)).toEqual([
      stoppedEvent(),
    ])
    expect(pendingConfirm.turns).toEqual([])
    expect(pendingConfirm.outbox).toEqual([])
  } finally {
    release.resolve()
    await confirming
    hold = false
  }
  expect(store.snapshot.turns).toEqual([])
  expect(store.snapshot.outbox).toEqual([])
  expect(writes).toHaveLength(5)
  const rejected = await store.append(
    { ...startEvent('oversize'), messageIds: ['x'.repeat(1_048_576)] },
    100,
  )
  expect(rejected).toBe(null)
  expect(store.snapshot.turns).toEqual([])
  expect(store.snapshot.nextEventNumber).toBe(3)
  await store.append(startEvent('failed'), 100)
  await store.append(
    {
      type: 'turn.failed',
      sessionId: 'failed',
      turnId: 'turn-failed',
      error: { code: 'provider_failed', message: 'The provider failed.' },
      retryMessageId: 'message-failed',
      durationMs: 0,
    },
    100,
  )
  expect(store.snapshot.turns).toEqual([
    {
      sessionId: 'failed',
      turnId: 'turn-failed',
      startedAt: 100,
      messageIds: ['message-failed'],
      startEventNumber: 3,
      endEventNumber: 4,
    },
  ])
  expect(writes.at(-1)?.outbox.map(({ event }) => event.type)).toEqual([
    'turn.started',
    'turn.failed',
  ])
  expect(writes.at(-1)?.turns).toEqual(store.snapshot.turns)
  await store.confirm(4)
  expect(store.snapshot.turns).toEqual([])
})

it('prevents duplicate replay and interrupt ends while a recovered completion save is pending', async () => {
  let saved: RunnerState | null = null
  let hold = false
  const arrived = deferred<void>()
  const release = deferred<void>()
  const storage = {
    read: async () => saved,
    write: async (state: RunnerState) => {
      if (hold) {
        arrived.resolve()
        await release.promise
      }
      saved = structuredClone(state)
    },
  }
  const previous = await EventStore.open(storage)
  await previous.append(startEvent(), 100)
  const store = await EventStore.open(storage)
  const h = await engineFixture()
  const events: AgentChatEvent[] = []
  const engine = new AgentEngine({
    ...h.options,
    store,
    emit: async (event) => {
      await store.append(event, 100)
      events.push(event)
    },
  })
  onTestFinished(() => engine.close())
  hold = true
  const replay = engine.command(sessionTurn('saved'))
  await arrived.promise
  const duplicate = engine.command({
    ...sessionTurn('saved'),
    commandId: 'other-replay',
  })
  const interrupted = engine.command(stop('saved'))
  const repeatedStop = engine.command(stop('saved', 'turn-saved', 'repeated'))
  try {
    expect(store.snapshot.outbox.map(({ event }) => event)).toEqual([
      startEvent(),
    ])
    expect(h.providers.processes).toEqual([])
    expect(events).toEqual([])
  } finally {
    release.resolve()
    hold = false
    await Promise.all([replay, duplicate, interrupted, repeatedStop])
  }
  await engine.idle()
  expect(events).toEqual([stoppedEvent()])
  expect(store.snapshot.turns).toEqual([
    {
      sessionId: 'saved',
      turnId: 'turn-saved',
      startedAt: 100,
      messageIds: ['message-saved'],
      startEventNumber: 1,
      endEventNumber: 2,
    },
  ])
  expect(store.snapshot.outbox.map(({ event }) => event)).toEqual([
    startEvent(),
    stoppedEvent(),
  ])
  expect(h.providers.processes).toEqual([])
})
