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
  return (limits: PageLimits, after: number, through: number) =>
    pages.read(after, through, { sessionId: 'session', limits })
}

it('ends a session page once its events reach the byte limit', async () => {
  // Each envelope with 400 characters of text takes 589 JSON bytes, so the
  // second event passes the limit of 1,000 bytes.
  const text = 'x'.repeat(400)
  const read = await pagesOf(
    Array.from({ length: 3 }, (_, index) => answer(`answer-${index}`, text)),
  )
  const limits = { scan: 2_048, bytes: 1_000 }
  const first = await read(limits, 0, 3)
  expect(first.events.map((envelope) => envelope.eventNumber)).toEqual([1, 2])
  expect(first).toMatchObject({ hasMore: true, nextAfterEventNumber: 2 })
  const second = await read(limits, 2, 3)
  expect(second.events.map((envelope) => envelope.eventNumber)).toEqual([3])
  expect(second).not.toHaveProperty('hasMore')
})

it('ends a session page at the scan limit and goes on after it', async () => {
  const read = await pagesOf([
    ...Array.from({ length: 64 }, (_, index): WorkspaceEvent => ({
      type: 'workspace.title',
      name: `${index}`,
    })),
    answer('late'),
  ])
  const limits = { scan: 64, bytes: 4_194_304 }
  expect(await read(limits, 0, 65)).toEqual({
    throughEventNumber: 65,
    events: [],
    hasMore: true,
    nextAfterEventNumber: 64,
  })
  expect(await read(limits, 64, 65)).toEqual({
    throughEventNumber: 65,
    events: [
      {
        workspaceId: 'workspace',
        eventNumber: 65,
        occurredAt: 25,
        event: answer('late'),
      },
    ],
  })
})
