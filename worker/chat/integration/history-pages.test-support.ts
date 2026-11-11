import { expect } from 'vitest'

import { chatHistoryPath } from '../../../src/shared/events'
import { array } from '../agent-events'
import { counter, record } from '../inputs'

interface HistoryReply {
  status: number
  json(): Promise<unknown>
}

export async function readChatHistoryPages(
  request: (path: string) => Promise<HistoryReply>,
  orgId: string,
  workspaceId: string,
  sessionId: string,
) {
  const events: Record<string, unknown>[] = []
  const rawPages: Record<string, unknown>[] = []
  let before: number | undefined
  let through: number | undefined
  while (true) {
    const response = await request(
      chatHistoryPath(orgId, workspaceId, sessionId, before, through),
    )
    expect(response.status).toBe(200)
    const page = record(await response.json())
    rawPages.push(page)
    events.unshift(...array(page.events, record))
    through ??= counter(page.throughEventNumber)
    if (page.hasMore !== true) return { ...page, events, rawPages }
    before = counter(page.nextBeforeEventNumber)
  }
}
