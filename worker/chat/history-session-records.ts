import type { CapabilityChangeNote } from '../../src/shared/capability-change'
import { HISTORY_BATCH_SIZE, readForwardHistory } from './history-forward-pages'
import type { ShowHistoryEvent } from './history-page-event'
import type { ChatHistoryResponse } from './workspace-events'
import type { StoredWorkspaceEvent } from './history-storage'
import {
  capabilityHistoryKey,
  capabilityHistoryPrefix,
  historySessionKey,
  historySessionPrefix,
} from './history-session-keys'
import { chatEventKey } from './storage-keys'
import type { ChatData } from './types'

export const SESSION_BATCH_SIZE = HISTORY_BATCH_SIZE

export async function readCapabilityHistory(
  data: ChatData,
  sessionId: string,
  after: number,
): Promise<
  { eventNumber: number; occurredAt: number; event: CapabilityChangeNote }[]
> {
  const notes = []
  while (true) {
    const numbers = await data.list<number>({
      prefix: capabilityHistoryPrefix(sessionId),
      startAfter: capabilityHistoryKey(sessionId, after),
      limit: SESSION_BATCH_SIZE,
    })
    for (const eventNumber of numbers.values()) {
      const stored = await data.get<StoredWorkspaceEvent>(
        chatEventKey(eventNumber),
      )
      if (
        stored &&
        'event' in stored &&
        stored.event.type === 'capabilities.changed' &&
        stored.event.sessionId === sessionId
      )
        notes.push({
          eventNumber,
          occurredAt: stored.occurredAt,
          event: stored.event,
        })
      after = eventNumber
    }
    if (numbers.size < SESSION_BATCH_SIZE) return notes
  }
}

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
    limit: Math.min(options.limit, SESSION_BATCH_SIZE),
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
  shown: ShowHistoryEvent,
  budget?: { bytes: number },
): Promise<ChatHistoryResponse> {
  return readForwardHistory(
    after,
    through,
    (last, limit) =>
      listSessionHistory(data, sessionId, {
        startAfter: historySessionKey(sessionId, last),
        end: `${historySessionKey(sessionId, through)}\u0000`,
        limit,
      }),
    shown,
    budget,
  )
}
