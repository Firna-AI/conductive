import { expect, it, onTestFinished } from 'vitest'

import type { RunnerEventEnvelope } from '../../src/shared/runner'
import { FakeDurableObjectEndpoint } from '../../worker/test-support/fake-durable-object'
import { turn } from '../test-support/harness'
import { emptySnapshot, wireFixture } from '../test-support/wire'
import { RunnerLink } from './link'
import { Runner } from './runner'
import { mapTool } from './providers/tool'
import { EventStore, type RunnerState } from './state'

it('bounds the exact complete JSON envelope and continues without a number gap after oversize input', async () => {
  let saved: RunnerState | null = null
  const storage = {
    read: async () => saved,
    write: async (state: RunnerState) => {
      saved = structuredClone(state)
    },
  }
  const store = await EventStore.open(storage)
  const endpoint = new FakeDurableObjectEndpoint({
    workspaceId: 'workspace-1',
    workspaceToken: 'fake-token',
  })
  endpoint.confirmEvents = false
  const warnings: string[] = []
  const link = new RunnerLink(store, {
    workspaceId: 'workspace-1',
    request: { url: endpoint.url, workspaceToken: 'fake-token' },
    connect: endpoint.connect,
    now: () => 100,
    command: () => {},
    connected: async () => {},
    disconnected: () => {},
    warn: (message) => {
      warnings.push(message)
    },
  })
  onTestFinished(() => link.close())
  await link.connect()
  const empty = JSON.stringify({
    type: 'event',
    streamId: store.snapshot.streamId,
    eventNumber: 1,
    occurredAt: 100,
    event: { type: 'workspace.title', name: '' },
  })
  const budget = 1_048_576 - Buffer.byteLength(empty)
  const name = '\n'.repeat(Math.floor(budget / 2)) + (budget % 2 ? 'a' : '')
  await link.emit({ type: 'workspace.title', name })
  await link.emit({ type: 'workspace.title', name: name + 'a' })
  await link.emit({ type: 'workspace.title', name: 'after' })
  await link.idle()
  expect(endpoint.runnerEvents.map((item) => item.eventNumber)).toEqual([1, 2])
  expect(Buffer.byteLength(JSON.stringify(endpoint.runnerEvents[0]))).toBe(
    1_048_576,
  )
  expect(endpoint.runnerEvents[1]?.event).toEqual({
    type: 'workspace.title',
    name: 'after',
  })
  expect(store.snapshot.outbox).toEqual(endpoint.runnerEvents)
  expect(store.snapshot.nextEventNumber).toBe(3)
  expect(warnings).toEqual(['The runner event exceeds its byte limit.'])
  const h = await wireFixture()
  await h.runner.start(false)
  h.endpoint.send(turn())
  await h.runner.idle()
  h.providers.latest.emit({
    type: 'answer',
    messageId: 'huge',
    text: '\n'.repeat(524_288),
    userMessageIds: ['message-1'],
  })
  h.providers.latest.emit({
    type: 'answer',
    messageId: 'small',
    text: 'after',
    userMessageIds: ['message-1'],
  })
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  await h.runner.idle()
  expect(h.endpoint.runnerEvents.map(({ eventNumber }) => eventNumber)).toEqual(
    [1, 2, 3, 4, 5, 6],
  )
  expect(h.endpoint.runnerEvents.at(-2)?.event).toMatchObject({
    type: 'assistant.completed',
    text: 'after',
  })
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.completed',
    state: 'finished',
  })
  expect(h.warnings).toEqual(['The runner event exceeds its byte limit.'])
})

it('replays identical saved file parts after restart and removes confirmed refusals from its outbox', async () => {
  const snapshot = emptySnapshot()
  snapshot.entries = Array.from({ length: 6 }, (_, index) => ({
    path: '\n'.repeat(30_000) + index,
    name: 'file',
    kind: 'file',
    change: null,
  }))
  let dropped = false
  const attempted: RunnerEventEnvelope[] = []
  const h = await wireFixture(
    snapshot,
    {
      refuseEvent: ({ event }) =>
        event.type === 'assistant.completed' ? 'turn_not_active' : null,
    },
    (connection) => ({
      onMessage: (listener) => connection.onMessage(listener),
      onClose: (listener) => connection.onClose(listener),
      close: () => connection.close(),
      send: (message) => {
        if (message.type === 'event') attempted.push(structuredClone(message))
        connection.send(message)
        if (message.type === 'event' && !dropped) {
          dropped = true
          connection.close()
        }
      },
    }),
  )
  await h.runner.start(false)
  expect(h.endpoint.events).toEqual([])
  const pending = h.store.snapshot.outbox
  expect(pending).toHaveLength(4)
  await h.runner.close()
  const store = await EventStore.open(h.storage)
  const restarted = new Runner({ ...h.options, store })
  onTestFinished(() => restarted.close())
  await restarted.start(false)
  const savedParts = pending.slice(1)
  expect(attempted.slice(1, 4)).toEqual(savedParts)
  expect(attempted.slice(1, 4).map((event) => JSON.stringify(event))).toEqual(
    savedParts.map((event) => JSON.stringify(event)),
  )
  expect(h.endpoint.runnerEvents.slice(0, 4)).toEqual(pending)
  expect(
    h.endpoint.events.filter(({ event }) => event.type === 'files.snapshot'),
  ).toHaveLength(2)
  h.endpoint.send(turn())
  await restarted.idle()
  h.providers.latest.emit({
    type: 'answer',
    messageId: 'refused',
    text: 'lost',
    userMessageIds: ['message-1'],
  })
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-1'],
  })
  await restarted.idle()
  expect(
    h.endpoint.events
      .filter(({ event }) => event.type === 'runner.event-refused')
      .map(({ event }) => event),
  ).toEqual([
    {
      type: 'runner.event-refused',
      streamId: store.snapshot.streamId,
      runnerEventNumber: 10,
      runnerEventType: 'assistant.completed',
      reason: 'turn_not_active',
      sessionId: 'session-1',
      turnId: 'turn-1',
    },
  ])
  expect(h.endpoint.runnerEvents.at(-1)?.event).toMatchObject({
    type: 'turn.completed',
    state: 'finished',
  })
  expect(store.snapshot.outbox).toEqual([])
  const before = h.endpoint.events.length
  h.endpoint.disconnect()
  await restarted.connect()
  expect(
    h.endpoint.events.filter(
      ({ event }) => event.type === 'runner.event-refused',
    ),
  ).toHaveLength(1)
  expect(h.endpoint.events.length).toBe(before + 2)
  expect(h.warnings).toEqual([])
  h.endpoint.send(turn('summary'))
  await restarted.idle()
  h.endpoint.confirmEvents = false
  h.setTurnFiles(
    Array.from({ length: 201 }, (_, index) => ({
      path: `file-${index}`,
      change: 'modified',
      added: 1,
      removed: 0,
    })),
  )
  h.providers.latest.emit({
    type: 'tool',
    tool: mapTool(
      'saved',
      'Read',
      { description: '\\'.repeat(40_000) },
      'done',
    ),
  })
  h.providers.latest.emit({
    type: 'result',
    state: 'finished',
    userMessageIds: ['message-summary'],
  })
  await restarted.idle()
  const savedUpdates = store.snapshot.outbox
  expect(savedUpdates.map(({ event }) => event.type)).toEqual([
    'tool.updated',
    'turn.completed',
  ])
  expect(savedUpdates[0]?.event).toMatchObject({
    type: 'tool.updated',
    tool: { omittedDetailBytes: 7_233 },
  })
  expect(savedUpdates[1]?.event).toMatchObject({
    type: 'turn.completed',
    omittedFileCount: 1,
  })
  const parsed = await EventStore.open(h.storage)
  expect(JSON.stringify(parsed.snapshot.outbox)).toBe(
    JSON.stringify(savedUpdates),
  )
})
