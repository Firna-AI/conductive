import { expect, it } from 'vitest'

import { diskFixture } from '../test-support/disk'
import { engineFixture } from '../test-support/engine'
import {
  sessionTurn,
  startEvent,
  stoppedEvent,
  stop,
} from '../test-support/runtime'
import type { AgentEngine } from './engine'
import { EventStore } from './state'

it('commits each turn record with its start and end envelope and drops it only with the end confirmation', async () => {
  const { storage, writes, holdNextWrite } = await diskFixture()
  const store = await EventStore.open(storage)
  const record = {
    sessionId: 'saved',
    turnId: 'turn-saved',
    startedAt: 100,
    messageIds: ['message-saved'],
    startEventNumber: 1,
    endEventNumber: null,
  }
  const startWrite = holdNextWrite()
  const started = store.append(startEvent(), 100)
  const pendingStart = await startWrite.arrived
  try {
    expect(store.snapshot.turns).toEqual([])
    expect(store.snapshot.outbox).toEqual([])
    expect(pendingStart.turns).toEqual([record])
    expect(pendingStart.outbox.map(({ event }) => event)).toEqual([
      startEvent(),
    ])
  } finally {
    startWrite.release()
    await started
  }
  expect(writes).toHaveLength(2)
  await store.confirm(1)
  expect(store.snapshot.turns).toEqual([record])
  expect(store.snapshot.outbox).toEqual([])
  const endWrite = holdNextWrite()
  const ended = store.append(stoppedEvent(), 100)
  const pendingEnd = await endWrite.arrived
  try {
    expect(store.snapshot.turns).toEqual([record])
    expect(store.snapshot.outbox).toEqual([])
    expect(pendingEnd.turns).toEqual([{ ...record, endEventNumber: 2 }])
    expect(pendingEnd.outbox.map(({ event }) => event)).toEqual([
      stoppedEvent(),
    ])
  } finally {
    endWrite.release()
    await ended
  }
  expect(writes).toHaveLength(4)
  const confirmWrite = holdNextWrite()
  const confirming = store.confirm(2)
  const pendingConfirm = await confirmWrite.arrived
  try {
    expect(store.snapshot.turns).toEqual([{ ...record, endEventNumber: 2 }])
    expect(store.snapshot.outbox.map(({ event }) => event)).toEqual([
      stoppedEvent(),
    ])
    expect(pendingConfirm.turns).toEqual([])
    expect(pendingConfirm.outbox).toEqual([])
  } finally {
    confirmWrite.release()
    await confirming
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
  let engine: AgentEngine | null = null
  const { storage, holdNextWrite } = await diskFixture(async () => {
    await engine?.close()
  })
  const previous = await EventStore.open(storage)
  await previous.append(startEvent(), 100)
  const store = await EventStore.open(storage)
  const held = holdNextWrite()
  const h = await engineFixture({ store })
  engine = h.engine
  const events = h.events
  const replay = engine.command(sessionTurn('saved'))
  await held.arrived
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
    held.release()
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
