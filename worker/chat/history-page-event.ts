import { jsonBytes } from '../../src/shared/event-limits'
import { loadHistoryEvent, type StoredWorkspaceEvent } from './history-storage'
import type { ChatData } from './types'
import type { WorkspaceEventEnvelope } from './workspace-events'

const encoder = new TextEncoder()

export interface HistoryPageEvent {
  envelope: WorkspaceEventEnvelope
  storedBytes?: number
}

export type ShowHistoryEvent = (
  stored: StoredWorkspaceEvent,
) => Promise<HistoryPageEvent | null>

export function historyEventBytes(event: HistoryPageEvent): number {
  return event.storedBytes ?? jsonBytes(event.envelope)
}

/** Counts the stored chunks while the storage reader loads and validates them. */
export async function loadChunkedPageEvent(
  data: ChatData,
  stored: Exclude<StoredWorkspaceEvent, WorkspaceEventEnvelope>,
): Promise<HistoryPageEvent> {
  let bytes = 0
  let endsWithHighSurrogate = false
  const envelope = await loadHistoryEvent(
    {
      async get<T>(key: string) {
        const chunk = await data.get<T>(key)
        if (typeof chunk === 'string' && chunk.length > 0) {
          bytes += encoder.encode(chunk).byteLength
          // Two encoded replacements count six bytes. The joined pair counts four.
          const first = chunk.charCodeAt(0)
          if (endsWithHighSurrogate && first >= 0xdc00 && first <= 0xdfff)
            bytes -= 2
          const last = chunk.charCodeAt(chunk.length - 1)
          endsWithHighSurrogate = last >= 0xd800 && last <= 0xdbff
        }
        return chunk
      },
      put: (key, value) => data.put(key, value),
      delete: (key) => data.delete(key),
      list: (options) => data.list(options),
    },
    stored,
  )
  return {
    envelope,
    storedBytes: bytes + jsonBytes({ ...envelope, event: 0 }) - 1,
  }
}
