import { expect, it } from 'vitest'
import type { WorkspaceEvent } from '../../src/shared/events'
import { chatEventsOf } from '../../src/shared/transcript/session-events'
import { SessionLog } from '../../src/shared/transcript/session-log'
import { itemRows } from './history-order.test-support'
import { HistoryPages, type PageLimits } from './history-pages'
import { saveHistoryEvent } from './history-storage'
import { nativeChatStore } from './native-store.test-support'
import { chatEventKey } from './storage-keys'
import { ChatStore } from './store'

const answer = (
  messageId: string,
  text = messageId,
): Extract<WorkspaceEvent, { type: 'assistant.completed' }> => ({
  type: 'assistant.completed',
  sessionId: 'session',
  turnId: 'turn',
  messageId,
  text,
  userMessageIds: [],
})

async function pagesOf(events: readonly WorkspaceEvent[]) {
  const { storage } = await nativeChatStore()
  await new ChatStore(storage, () => 25).change(
    'workspace',
    async (transaction) => {
      for (const event of events) await transaction.emit(event)
    },
    () => undefined,
  )
  const pages = new HistoryPages(storage)
  return (limits: PageLimits, through: number, before?: number) =>
    pages.readNewest(before, through, { sessionId: 'session', limits })
}

it('reads the newest session events through the inclusive cutoff in event order', async () => {
  const read = await pagesOf([
    answer('oldest'),
    answer('earlier'),
    answer('middle'),
    answer('recent'),
    answer('cutoff'),
    answer('after-cutoff'),
  ])
  const page = await read({ scan: 2, bytes: Infinity }, 5)
  expect(page.events.map(({ eventNumber }) => eventNumber)).toEqual([4, 5])
  expect(page).toMatchObject({
    throughEventNumber: 5,
    hasMore: true,
    nextBeforeEventNumber: 4,
  })
  expect(page).not.toHaveProperty('nextAfterEventNumber')
})

it('moves each earlier page back exclusively past other sessions and workspace events', async () => {
  const read = await pagesOf([
    answer('oldest'),
    { type: 'workspace.title', name: 'Old title' },
    { ...answer('other-old'), sessionId: 'other' },
    answer('earlier'),
    { ...answer('other-middle'), sessionId: 'other' },
    { type: 'workspace.title', name: 'New title' },
    answer('middle'),
    { ...answer('other-new'), sessionId: 'other' },
    { type: 'files.snapshot', tree: { revision: 1, entries: [] } },
    answer('newest'),
  ])
  const limits = { scan: 3, bytes: Infinity }
  const first = await read(limits, 10)
  const second = await read(limits, 10, first.nextBeforeEventNumber)
  const third = await read(limits, 10, second.nextBeforeEventNumber)
  const last = await read(limits, 10, third.nextBeforeEventNumber)
  expect(
    [first, second, third, last].map((page) => ({
      numbers: page.events.map(({ eventNumber }) => eventNumber),
      cursor: page.nextBeforeEventNumber ?? null,
      through: page.throughEventNumber,
    })),
  ).toEqual([
    { numbers: [10], cursor: 8, through: 10 },
    { numbers: [7], cursor: 5, through: 10 },
    { numbers: [4], cursor: 2, through: 10 },
    { numbers: [1], cursor: null, through: 10 },
  ])
  expect(last).not.toHaveProperty('hasMore')
  expect(last).not.toHaveProperty('nextAfterEventNumber')
})

it('bounds scans and moves an empty page back to the oldest session event', async () => {
  const read = await pagesOf([
    answer('oldest'),
    ...Array.from({ length: 6 }, (_, index): WorkspaceEvent => ({
      type: 'workspace.title',
      name: String(index),
    })),
  ])
  const limits = { scan: 3, bytes: 1_000 }
  expect(await read(limits, 7)).toEqual({
    throughEventNumber: 7,
    events: [],
    hasMore: true,
    nextBeforeEventNumber: 5,
  })
  expect(await read(limits, 7, 5)).toEqual({
    throughEventNumber: 7,
    events: [],
    hasMore: true,
    nextBeforeEventNumber: 2,
  })
  const last = await read(limits, 7, 2)
  expect(last.events.map(({ eventNumber }) => eventNumber)).toEqual([1])
  expect(last).not.toHaveProperty('hasMore')
})

it('ends at the oldest stored session event when compaction removed an earlier key', async () => {
  const read = await pagesOf([
    { type: 'files.snapshot', tree: { revision: 1, entries: [] } },
    answer('oldest'),
    answer('newest'),
    { type: 'files.snapshot', tree: { revision: 2, entries: [] } },
  ])
  const last = await read({ scan: 2, bytes: Infinity }, 3)
  expect(last.events.map(({ eventNumber }) => eventNumber)).toEqual([2, 3])
  expect(last).not.toHaveProperty('hasMore')
  expect(last).not.toHaveProperty('nextBeforeEventNumber')
})

it('ends a reverse page at the session byte budget and continues before it', async () => {
  const read = await pagesOf([
    answer('answer-1', 'x'.repeat(400)),
    answer('answer-2', 'x'.repeat(400)),
    answer('answer-3', 'x'.repeat(400)),
  ])
  const limits = { scan: 2_048, bytes: 1_000 }
  const first = await read(limits, 3)
  expect(first.events.map(({ eventNumber }) => eventNumber)).toEqual([2, 3])
  expect(first).toMatchObject({ hasMore: true, nextBeforeEventNumber: 2 })
  const last = await read(limits, 3, 2)
  expect(last.events.map(({ eventNumber }) => eventNumber)).toEqual([1])
  expect(last).not.toHaveProperty('hasMore')
})

it('takes one stored step when one session event exceeds the byte budget', async () => {
  const read = await pagesOf([answer('oldest'), answer('newest')])
  const limits = { scan: 1, bytes: 1 }
  const first = await read(limits, 2)
  expect(first.events.map(({ eventNumber }) => eventNumber)).toEqual([2])
  expect(first).toMatchObject({ hasMore: true, nextBeforeEventNumber: 2 })
  const last = await read(limits, 2, 2)
  expect(last.events.map(({ eventNumber }) => eventNumber)).toEqual([1])
  expect(last).not.toHaveProperty('hasMore')
})

it('prepares legacy compaction and keeps one full answer at its first place across reverse pages', async () => {
  const { storage } = await nativeChatStore()
  const context = { sessionId: 'session', turnId: 'turn', messageId: 'answer' }
  const events: WorkspaceEvent[] = [
    { ...context, type: 'assistant.delta', text: 'partial-first' },
    {
      type: 'tool.updated',
      sessionId: 'session',
      turnId: 'turn',
      tool: {
        id: 'tool',
        kind: 'run',
        target: 'test',
        state: 'running',
        detail: null,
        omittedDetailBytes: 0,
      },
    },
    { ...context, type: 'assistant.delta', text: 'partial-next' },
    {
      ...context,
      type: 'assistant.completed',
      text: 'Full answer',
      userMessageIds: [],
    },
    {
      ...context,
      type: 'assistant.completed',
      text: 'After cutoff',
      userMessageIds: [],
    },
  ]
  for (const [index, event] of events.entries())
    await saveHistoryEvent(storage, chatEventKey(index + 1), {
      workspaceId: 'workspace',
      eventNumber: index + 1,
      occurredAt: index + 11,
      event,
    })
  const pages = new HistoryPages(storage)
  const session = { sessionId: 'session', limits: { scan: 2, bytes: Infinity } }
  const first = await pages.readNewest(undefined, 4, session)
  expect(first.events.map(({ eventNumber }) => eventNumber)).toEqual([4])
  expect(first).toMatchObject({ hasMore: true, nextBeforeEventNumber: 3 })
  const last = await pages.readNewest(3, 4, session)
  expect(last.events.map(({ eventNumber }) => eventNumber)).toEqual([1, 2])
  expect(last).not.toHaveProperty('hasMore')
  const log = new SessionLog()
  for (const page of [first, last])
    log.merge(chatEventsOf('session', page.events))
  expect(itemRows(log)).toEqual([
    { kind: 'answer', text: 'Full answer', at: 11 },
    { kind: 'tool', id: 'tool', detail: null, state: 'running', at: 12 },
  ])
  expect(JSON.stringify([first, last])).not.toContain('partial-')
  expect(JSON.stringify([first, last])).not.toContain('After cutoff')
})
