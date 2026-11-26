import { historyEventBytes, type ShowHistoryEvent } from './history-page-event'
import type { StoredWorkspaceEvent } from './history-storage'
import type {
  ChatHistoryResponse,
  WorkspaceEventEnvelope,
} from './workspace-events'

export const HISTORY_BATCH_SIZE = 4
export const HISTORY_PAGE_LIMITS = { scan: 2_048, bytes: 4_194_304 }

interface HistoryRecord {
  eventNumber: number
  stored: StoredWorkspaceEvent | undefined
}

export async function readForwardHistory(
  after: number,
  through: number,
  list: (after: number, limit: number) => Promise<HistoryRecord[]>,
  shown: ShowHistoryEvent,
  budget?: { bytes: number },
): Promise<ChatHistoryResponse> {
  const events: WorkspaceEventEnvelope[] = []
  let remaining = Math.min(HISTORY_PAGE_LIMITS.bytes, budget?.bytes ?? Infinity)
  let scanned = 0
  let last = after
  let more = false
  batches: while (last < through && scanned < HISTORY_PAGE_LIMITS.scan) {
    const limit = Math.min(
      HISTORY_BATCH_SIZE,
      HISTORY_PAGE_LIMITS.scan - scanned,
    )
    const records = await list(last, limit)
    more = records.length === limit
    for (const [index, { eventNumber, stored }] of records.entries()) {
      if (eventNumber > through) {
        more = false
        break batches
      }
      last = eventNumber
      scanned += 1
      const event = stored === undefined ? null : await shown(stored)
      if (event === null) continue
      events.push(event.envelope)
      const bytes = historyEventBytes(event)
      remaining -= bytes
      if (budget) budget.bytes -= bytes
      if (remaining <= 0) {
        more ||= index < records.length - 1
        break batches
      }
    }
    if (!more) break
  }
  const page = { events, throughEventNumber: through }
  return more && last < through
    ? { ...page, hasMore: true, nextAfterEventNumber: last }
    : page
}
