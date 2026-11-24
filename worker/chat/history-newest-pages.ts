import { historyEventBytes, type ShowHistoryEvent } from './history-page-event'
import type { PageLimits } from './history-pages'
import { historySessionKey, historySessionPrefix } from './history-session-keys'
import {
  listSessionHistory,
  SESSION_BATCH_SIZE,
} from './history-session-records'
import type { ChatData } from './types'
import type {
  NewestChatHistoryResponse,
  WorkspaceEventEnvelope,
} from './workspace-events'

/** Reads stored events backwards, but presents each page in event order. */
export async function readNewestHistory(
  data: ChatData,
  sessionId: string,
  before: number | undefined,
  through: number,
  limits: PageLimits,
  shown: ShowHistoryEvent,
): Promise<NewestChatHistoryResponse> {
  const events: WorkspaceEventEnvelope[] = []
  const scanLimit = Math.max(1, limits.scan)
  let end =
    before === undefined || before > through
      ? `${historySessionKey(sessionId, through)}\u0000`
      : historySessionKey(sessionId, before)
  let last: number | undefined
  let scanned = 0
  let bytes = 0
  let more: boolean
  do {
    const limit = Math.min(SESSION_BATCH_SIZE, scanLimit - scanned)
    const records = await listSessionHistory(data, sessionId, {
      end,
      reverse: true,
      limit,
    })
    more = records.length === limit
    for (const [index, { eventNumber, stored }] of records.entries()) {
      last = eventNumber
      scanned += 1
      const event = stored === undefined ? null : await shown(stored)
      if (event) {
        events.push(event.envelope)
        if (limits.bytes !== Infinity) bytes += historyEventBytes(event)
      }
      if (bytes < limits.bytes) continue
      more ||= index < records.length - 1
      break
    }
    if (last === undefined) break
    end = historySessionKey(sessionId, last)
  } while (more && scanned < scanLimit && bytes < limits.bytes)
  events.reverse()
  if (!more || last === undefined || last <= 1)
    return { events, throughEventNumber: through }
  const earlier = await data.list<number>({
    prefix: historySessionPrefix(sessionId),
    end: historySessionKey(sessionId, last),
    reverse: true,
    limit: 1,
  })
  if (earlier.size === 0) return { events, throughEventNumber: through }
  return {
    events,
    throughEventNumber: through,
    hasMore: true,
    nextBeforeEventNumber: last,
  }
}
