import { Buffer } from 'node:buffer'
import { expect, it, vi } from 'vitest'
import type { FileEvent } from '../../src/shared/files'
import { historyMemory } from './history-memory.test-support'
import { HistoryPages } from './history-pages'
import {
  legacyHistory,
  sessionAnswer,
} from './history-session-index.test-support'
import {
  historySessionKey,
  SESSION_INDEX_THROUGH,
} from './history-session-keys'
import { CHAT_EVENT_PREFIX, chatEventKey } from './storage-keys'
import { firstStopRequester } from './stop-request'
import { ChatStore } from './store'
import type { StoredTurn } from './types'
import type { WorkspaceEvent } from './workspace-events'

const pageBytes = 4_194_304
const title = (name: string): WorkspaceEvent => ({
  type: 'workspace.title',
  name,
})

function eventBytes(eventNumber: number, event: WorkspaceEvent): number {
  return Buffer.byteLength(
    JSON.stringify({
      workspaceId: 'workspace',
      eventNumber,
      occurredAt: 25,
      event,
    }),
  )
}

function delta(name: string, legacyField = '') {
  return {
    type: 'files.changed',
    delta: {
      revision: 2,
      changes: [
        {
          operation: 'upsert',
          entry: { path: 'file.txt', name, kind: 'file', change: null },
        },
      ],
    },
    legacyField,
  } satisfies FileEvent & { legacyField: string }
}

it('includes the event that brings a forward page to exactly 4 MiB of stored JSON', async () => {
  const { storage } = historyMemory()
  const first = title('First')
  const nameOffset =
    JSON.stringify(delta('')).indexOf('"name":""') + '"name":"'.length
  // The first chunk ends with the first UTF-16 unit of the emoji.
  const name = 'x'.repeat(65_535 - nameOffset) + '🙂"\\\n'
  const padding = pageBytes - eventBytes(1, first) - eventBytes(2, delta(name))
  const file = delta(name, 'x'.repeat(padding))
  await legacyHistory(storage, [
    first,
    file,
    title('Next'),
    title('Beyond cutoff'),
  ])
  const pages = new HistoryPages(storage)
  const budget = { bytes: 8_388_608 }

  const page = await pages.read(0, 3, { budget })
  expect(page).toMatchObject({
    throughEventNumber: 3,
    hasMore: true,
    nextAfterEventNumber: 2,
  })
  expect(page.events.map(({ eventNumber }) => eventNumber)).toEqual([1, 2])
  expect(page.events[1]?.event).toEqual({
    type: 'files.changed',
    delta: file.delta,
  })
  expect(budget.bytes).toBe(4_194_304)
  const next = await pages.read(2, 3, { budget })
  expect(next).toEqual({
    throughEventNumber: 3,
    events: [
      {
        workspaceId: 'workspace',
        eventNumber: 3,
        occurredAt: 25,
        event: title('Next'),
      },
    ],
  })
})

it('returns an oversized first event on its own forward page and resumes after it', async () => {
  const { storage } = historyMemory()
  await legacyHistory(storage, [
    delta('x'.repeat(pageBytes)),
    title('Next'),
    title('Last'),
  ])
  const pages = new HistoryPages(storage)
  const first = await pages.read(0, 3)
  expect(first).toMatchObject({
    throughEventNumber: 3,
    hasMore: true,
    nextAfterEventNumber: 1,
  })
  expect(first.events.map(({ eventNumber }) => eventNumber)).toEqual([1])
  const rest = await pages.read(1, 3)
  expect(rest.events.map(({ eventNumber }) => eventNumber)).toEqual([2, 3])
  expect(rest).not.toHaveProperty('hasMore')
})

it('prepares legacy compaction through the cutoff with four-record storage lists', async () => {
  const { storage } = historyMemory()
  await legacyHistory(
    storage,
    Array.from({ length: 10 }, (_, index) => title(String(index))),
    false,
  )
  const list = vi.spyOn(storage, 'list')
  const pages = new HistoryPages(storage)
  await pages.prepare(9)
  expect(
    list.mock.calls.map(([{ prefix, startAfter, limit }]) => ({
      prefix,
      startAfter,
      limit,
    })),
  ).toEqual(
    [0, 4, 8].map((number) => ({
      prefix: CHAT_EVENT_PREFIX,
      startAfter: chatEventKey(number),
      limit: 4,
    })),
  )
})

it('includes a crossing event in indexed history and keeps later events across missing bodies', async () => {
  const { storage } = historyMemory()
  const text = 'x'.repeat(100_000)
  const events = Array.from({ length: 47 }, (_, i) => ({
    ...sessionAnswer(`answer-${i}`),
    text,
  }))
  await legacyHistory(storage, events)
  for (let number = 1; number <= 47; number++)
    await storage.put(historySessionKey('session', number), number)
  await storage.put(SESSION_INDEX_THROUGH, 47)
  await storage.delete(chatEventKey(3))
  await storage.delete(chatEventKey(40))
  await storage.delete(chatEventKey(45))

  const pages = new HistoryPages(storage)
  const first = await pages.read(0, 46, { sessionId: 'session' })
  expect(first).toMatchObject({
    throughEventNumber: 46,
    hasMore: true,
    nextAfterEventNumber: 44,
  })
  expect(first.events.map(({ eventNumber }) => eventNumber)).toEqual(
    Array.from({ length: 44 }, (_, i) => i + 1).filter(
      (number) => number !== 3 && number !== 40,
    ),
  )
  const second = await pages.read(44, 46, { sessionId: 'session' })
  expect(second.events.map(({ eventNumber }) => eventNumber)).toEqual([46])
  expect(second).not.toHaveProperty('hasMore')
  const newest = await pages.readNewest(46, 47, {
    sessionId: 'session',
    limits: { scan: 1, bytes: Infinity },
  })
  expect(newest).toEqual({
    events: [],
    throughEventNumber: 47,
    hasMore: true,
    nextBeforeEventNumber: 45,
  })
})

it('advances an empty write-transaction fallback page and finds the first stop requester on a later page', async () => {
  const { storage } = historyMemory()
  const stop = (requestedById: string): WorkspaceEvent => ({
    type: 'turn.stop-requested',
    sessionId: 'session',
    turnId: 'turn',
    requestedById,
  })
  await legacyHistory(storage, [
    ...Array.from({ length: 4_100 }, (_, index): WorkspaceEvent => ({
      type: 'turn.thinking',
      sessionId: 'other',
      turnId: `other-${index}`,
    })),
    stop('first'),
    stop('second'),
  ])
  const turn: StoredTurn = {
    id: 'turn',
    sessionId: 'session',
    senderId: 'sender',
    state: 'stopping',
    messageIds: [],
    closeAfterStop: false,
  }
  const store = new ChatStore(storage, () => 25)
  const result = await store.change(
    'workspace',
    async (view) => ({
      first: await view.history(0, view.eventNumber, { sessionId: 'session' }),
      requester: await firstStopRequester(view, turn),
    }),
    () => undefined,
  )
  expect(result.first).toEqual({
    events: [],
    throughEventNumber: 4_102,
    hasMore: true,
    nextAfterEventNumber: 2_048,
  })
  expect(result.requester).toEqual({ requestedById: 'first' })
  expect(await storage.get(SESSION_INDEX_THROUGH)).toBeUndefined()
})
