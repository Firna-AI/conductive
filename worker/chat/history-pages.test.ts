import { expect, it, vi } from 'vitest'

import type { WorkspaceEvent } from '../../src/shared/events'
import { MemoryChatStorage } from './memory-storage.test-support'
import { ChatStore } from './store'
import { saveHistoryEvent } from './history-storage'
import { CHAT_EVENT_PREFIX, CHAT_META, chatEventKey } from './storage-keys'
import { WorkspaceSummaryProjection } from './workspace-summary'

it('reads bounded history pages and advances through all stored state', async () => {
  const storage = new MemoryChatStorage()
  const store = new ChatStore(storage, () => 25)
  await store.change(
    'workspace',
    async (transaction) => {
      for (let number = 1; number <= 70; number++)
        await transaction.emit({ type: 'workspace.title', name: `${number}` })
    },
    () => undefined,
  )
  const lists = vi.spyOn(storage, 'list')
  const first = await store.read('workspace', (view) => view.history(0))
  expect(first).toMatchObject({
    throughEventNumber: 70,
    hasMore: true,
    nextAfterEventNumber: 32,
  })
  expect(first.events).toHaveLength(32)
  const second = await store.read('workspace', (view) =>
    view.history(first.nextAfterEventNumber ?? 0, first.throughEventNumber),
  )
  expect(second).toMatchObject({
    throughEventNumber: 70,
    hasMore: true,
    nextAfterEventNumber: 64,
  })
  expect(second.events).toHaveLength(32)
  const last = await store.read('workspace', (view) =>
    view.history(second.nextAfterEventNumber ?? 0, second.throughEventNumber),
  )
  expect(last.throughEventNumber).toBe(70)
  expect(last).not.toHaveProperty('hasMore')
  expect(last.events).toHaveLength(6)
  expect(
    [...first.events, ...second.events, ...last.events].map(
      (envelope) => envelope.eventNumber,
    ),
  ).toEqual(Array.from({ length: 70 }, (_, index) => index + 1))
  expect(
    lists.mock.calls
      .filter(([options]) => options.prefix === CHAT_EVENT_PREFIX)
      .map(([options]) => options.limit),
  ).toEqual([32, 32, 32])
})

it('indexes legacy history before an append and removes replaced tree chunks', async () => {
  const storage = new MemoryChatStorage()
  const store = new ChatStore(storage, () => 25)
  await new WorkspaceSummaryProjection(
    storage,
    async () => [],
    async () => ({ events: [], throughEventNumber: 0 }),
  ).read(0)
  const context = { sessionId: 'session', turnId: 'turn', messageId: 'answer' }
  const events: WorkspaceEvent[] = [
    {
      type: 'files.snapshot',
      tree: {
        revision: 1,
        entries: Array.from({ length: 2_000 }, (_, index) => ({
          path: `legacy-${index}-${'x'.repeat(600)}`,
          name: 'old',
          kind: 'file',
          change: null,
        })),
      },
    },
    { ...context, type: 'assistant.delta', text: 'Old pieces' },
    {
      ...context,
      type: 'assistant.completed',
      text: 'Full answer',
      userMessageIds: [],
    },
    { type: 'files.snapshot', tree: { revision: 2, entries: [] } },
  ]
  for (const [index, event] of events.entries())
    await saveHistoryEvent(storage, chatEventKey(index + 1), {
      workspaceId: 'workspace',
      eventNumber: index + 1,
      occurredAt: 25,
      event,
    })
  await storage.put(CHAT_META, {
    workspaceId: 'workspace',
    through: 4,
    commandThrough: 0,
  })
  const legacyChunks = [...storage.records.values()].filter(
    (value) => typeof value === 'string',
  )
  expect(legacyChunks.length).toBeGreaterThan(0)
  await store.change(
    'workspace',
    (transaction) =>
      transaction.emit({ type: 'workspace.title', name: 'Appended first' }),
    () => undefined,
  )
  const history = await store.read('workspace', (view) => view.history(0))
  expect(history.events.map((event) => event.eventNumber)).toEqual([2, 3, 4, 5])
  expect(history.events[0]?.event).toEqual({
    ...context,
    type: 'assistant.delta',
    text: '',
  })
  expect(history.throughEventNumber).toBe(5)
  expect(await storage.get(chatEventKey(1))).toBeUndefined()
  expect(
    [...storage.records.values()].filter((value) => typeof value === 'string'),
  ).toEqual([])
})

it('keeps final answers and tool states with the newest tree without dropping live events', async () => {
  const storage = new MemoryChatStorage()
  const store = new ChatStore(storage, () => 25)
  const context = { sessionId: 'session', turnId: 'turn' }
  const tool = {
    id: 'tool',
    kind: 'run' as const,
    target: 'test',
    detail: null,
    omittedDetailBytes: 0,
  }
  const inputs: WorkspaceEvent[] = [
    { type: 'files.snapshot', tree: { revision: 1, entries: [] } },
    { ...context, type: 'assistant.delta', messageId: 'answer', text: 'Part' },
    { ...context, type: 'tool.updated', tool: { ...tool, state: 'running' } },
    {
      ...context,
      type: 'assistant.completed',
      messageId: 'answer',
      text: 'Complete answer',
      userMessageIds: [],
    },
    { ...context, type: 'assistant.delta', messageId: 'answer', text: 'Later' },
    { ...context, type: 'tool.updated', tool: { ...tool, state: 'done' } },
    { ...context, type: 'tool.updated', tool: { ...tool, state: 'failed' } },
    { ...context, type: 'assistant.delta', messageId: 'open', text: 'Keep' },
    {
      ...context,
      type: 'tool.updated',
      tool: { ...tool, id: 'open-tool', state: 'running' },
    },
    { type: 'files.snapshot', tree: { revision: 2, entries: [] } },
  ]
  const published: number[] = []
  for (const event of inputs)
    await store.change(
      'workspace',
      (transaction) => transaction.emit(event),
      (events) => published.push(...events.map((entry) => entry.eventNumber)),
    )
  expect(published).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
  const history = await store.read('workspace', (view) => view.history(0))
  expect(history.throughEventNumber).toBe(10)
  expect(history.events.map((entry) => entry.eventNumber)).toEqual([
    2, 3, 4, 5, 7, 8, 9, 10,
  ])
  expect(history.events.map((entry) => entry.event)).toEqual([
    { ...inputs[1], text: '' },
    inputs[2],
    inputs[3],
    inputs[4],
    inputs[6],
    inputs[7],
    inputs[8],
    inputs[9],
  ])
  const resumed = await store.read('workspace', (view) => view.history(2))
  expect(resumed.events.map((entry) => entry.eventNumber)).toEqual([
    3, 4, 5, 7, 8, 9, 10,
  ])
})
