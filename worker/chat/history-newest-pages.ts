import { jsonBytes } from '../../src/shared/event-limits'
import type { PageLimits } from './history-pages'
import type { StoredWorkspaceEvent } from './history-storage'
import { CHAT_EVENT_PREFIX, chatEventKey } from './storage-keys'
import type { ChatData } from './types'
import type {
  NewestChatHistoryResponse,
  WorkspaceEventEnvelope,
} from './workspace-events'

const LIST_SIZE = 32

/** Reads stored events backwards, but presents each page in event order. */
export async function readNewestHistory(
  data: ChatData,
  before: number | undefined,
  through: number,
  limits: PageLimits,
  shown: (
    stored: StoredWorkspaceEvent,
  ) => Promise<WorkspaceEventEnvelope | null>,
): Promise<NewestChatHistoryResponse> {
  const events: WorkspaceEventEnvelope[] = []
  const scanLimit = Math.max(1, limits.scan)
  let end =
    before === undefined || before > through
      ? `${chatEventKey(through)}\u0000`
      : chatEventKey(before)
  let last: number | undefined
  let scanned = 0
  let bytes = 0
  let more: boolean
  do {
    const limit = Math.min(LIST_SIZE, scanLimit - scanned)
    const records = [
      ...(
        await data.list<StoredWorkspaceEvent>({
          prefix: CHAT_EVENT_PREFIX,
          end,
          reverse: true,
          limit,
        })
      ).values(),
    ]
    more = records.length === limit
    for (const [index, stored] of records.entries()) {
      last = stored.eventNumber
      scanned += 1
      const envelope = await shown(stored)
      if (envelope) {
        events.push(envelope)
        if (limits.bytes !== Infinity) bytes += jsonBytes(envelope)
      }
      if (bytes < limits.bytes) continue
      more ||= index < records.length - 1
      break
    }
    if (last === undefined) break
    end = chatEventKey(last)
  } while (more && scanned < scanLimit && bytes < limits.bytes)
  events.reverse()
  if (!more || last === undefined || last <= 1)
    return { events, throughEventNumber: through }
  const earlier = await data.list<StoredWorkspaceEvent>({
    prefix: CHAT_EVENT_PREFIX,
    end: chatEventKey(last),
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
