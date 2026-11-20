import type {
  ChatHistoryResponse,
  WorkspaceEventEnvelope,
} from './workspace-events'
import type { StoredWorkspaceEvent } from './history-storage'
import { historySessionKey, historySessionPrefix } from './history-session-keys'
import { chatEventKey } from './storage-keys'
import type { ChatData } from './types'

export const SESSION_BATCH_SIZE = 32

export async function listSessionHistory(
  data: ChatData,
  sessionId: string,
  options: {
    startAfter?: string
    end: string
    reverse?: boolean
    limit: number
  },
) {
  const numbers = await data.list<number>({
    prefix: historySessionPrefix(sessionId),
    ...options,
  })
  return Promise.all(
    [...numbers.values()].map(async (eventNumber) => ({
      eventNumber,
      stored: await data.get<StoredWorkspaceEvent>(chatEventKey(eventNumber)),
    })),
  )
}

export async function readSessionHistory(
  data: ChatData,
  sessionId: string,
  after: number,
  through: number,
  shown: (
    stored: StoredWorkspaceEvent,
  ) => Promise<WorkspaceEventEnvelope | null>,
): Promise<ChatHistoryResponse> {
  const records = await listSessionHistory(data, sessionId, {
    startAfter: historySessionKey(sessionId, after),
    end: `${historySessionKey(sessionId, through)}\u0000`,
    limit: SESSION_BATCH_SIZE,
  })
  const events: WorkspaceEventEnvelope[] = []
  for (const { stored } of records) {
    const envelope = stored === undefined ? null : await shown(stored)
    if (envelope) events.push(envelope)
  }
  const last = records.at(-1)?.eventNumber
  if (
    records.length < SESSION_BATCH_SIZE ||
    last === undefined ||
    last >= through
  )
    return { events, throughEventNumber: through }
  return {
    events,
    throughEventNumber: through,
    hasMore: true,
    nextAfterEventNumber: last,
  }
}
