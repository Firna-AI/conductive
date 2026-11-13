import { expect, it } from 'vitest'
import type { WorkspaceEvent } from '../../src/shared/events'
import { HistoryPages, type PageLimits } from './history-pages'
import { nativeChatStore } from './native-store.test-support'
import { ChatStore } from './store'

const answer = (messageId: string, text = messageId): WorkspaceEvent => ({
  type: 'assistant.completed',
  sessionId: 'session',
  turnId: 'turn',
  messageId,
  text,
  userMessageIds: [],
})

/** Stores the events, and reads pages of the session within given limits. */
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
  return (limits: PageLimits, before: number | undefined, through: number) =>
    pages.readNewest(before, through, { sessionId: 'session', limits })
}

it('ends a newest-first session page once its events reach the UTF-8 byte limit', async () => {
  // Each envelope with 100 emoji takes 589 JSON bytes, so the
  // second event passes the limit of 1,000 bytes.
  const text = '🙂'.repeat(100)
  const read = await pagesOf(
    Array.from({ length: 3 }, (_, index) => answer(`answer-${index}`, text)),
  )
  const limits = { scan: 2_048, bytes: 1_000 }
  const first = await read(limits, undefined, 3)
  expect(first.events.map((envelope) => envelope.eventNumber)).toEqual([2, 3])
  expect(first).toMatchObject({ hasMore: true, nextBeforeEventNumber: 2 })
  const second = await read(limits, 2, 3)
  expect(second.events.map((envelope) => envelope.eventNumber)).toEqual([1])
  expect(second).not.toHaveProperty('hasMore')
})

it('ends a newest-first session page at the scan limit and goes on before it', async () => {
  const read = await pagesOf([
    answer('late'),
    ...Array.from({ length: 64 }, (_, index): WorkspaceEvent => ({
      type: 'workspace.title',
      name: `${index}`,
    })),
  ])
  const limits = { scan: 64, bytes: 4_194_304 }
  expect(await read(limits, undefined, 65)).toEqual({
    throughEventNumber: 65,
    events: [],
    hasMore: true,
    nextBeforeEventNumber: 2,
  })
  expect(await read(limits, 2, 65)).toEqual({
    throughEventNumber: 65,
    events: [
      {
        workspaceId: 'workspace',
        eventNumber: 1,
        occurredAt: 25,
        event: answer('late'),
      },
    ],
  })
})
