import type {
  ChatHistoryResponse,
  WorkspaceEventEnvelope,
  WorkspaceEvent,
} from './workspace-events'
import { HistoryCompaction } from './history-compaction'
import {
  deleteHistoryEvent,
  loadHistoryEvent,
  type StoredWorkspaceEvent,
} from './history-storage'
import { CHAT_EVENT_PREFIX, chatEventKey, chatKey } from './storage-keys'
import type { ChatData } from './types'

const PAGE_SIZE = 32
const INDEX_THROUGH = chatKey('history-index', 'through')
const POSITION_THROUGH = chatKey('history-index', 'positions-through')
const NEWEST_TREE = chatKey('history-index', 'tree')

function inSession(event: WorkspaceEvent, sessionId: string): boolean {
  return (
    ('sessionId' in event && event.sessionId === sessionId) ||
    (event.type === 'message.accepted' &&
      event.message.sessionId === sessionId) ||
    (event.type === 'session.updated' && event.session.id === sessionId)
  )
}

/** The index keeps replacement identities without retaining event payloads. */
export class HistoryPages {
  private readonly data: ChatData
  private readonly compaction: HistoryCompaction

  constructor(data: ChatData) {
    this.data = data
    this.compaction = new HistoryCompaction(data)
  }

  async index(envelope: WorkspaceEventEnvelope): Promise<void> {
    const event = envelope.event
    if (event.type === 'files.snapshot') {
      const previous = await this.data.get<number>(NEWEST_TREE)
      if (previous !== undefined && previous < envelope.eventNumber)
        await deleteHistoryEvent(this.data, chatEventKey(previous))
      await this.data.put(NEWEST_TREE, envelope.eventNumber)
    }
    await this.compaction.index(envelope)
    await this.data.put(INDEX_THROUGH, envelope.eventNumber)
    await this.data.put(POSITION_THROUGH, envelope.eventNumber)
  }

  async prepare(through: number): Promise<void> {
    let after = Math.min(
      (await this.data.get<number>(INDEX_THROUGH)) ?? 0,
      (await this.data.get<number>(POSITION_THROUGH)) ?? 0,
    )
    if (after >= through) return
    while (after < through) {
      const records = await this.data.list<StoredWorkspaceEvent>({
        prefix: CHAT_EVENT_PREFIX,
        startAfter: chatEventKey(after),
        end: `${chatEventKey(through)}\u0000`,
        limit: PAGE_SIZE,
      })
      if (records.size === 0) break
      const previous = after
      for (const stored of records.values()) {
        if (stored.eventNumber > through) break
        await this.index(await loadHistoryEvent(this.data, stored))
        after = stored.eventNumber
      }
      if (after === previous) break
    }
    await this.data.put(INDEX_THROUGH, through)
    await this.data.put(POSITION_THROUGH, through)
  }

  async read(
    after: number,
    through: number,
    sessionId?: string,
  ): Promise<ChatHistoryResponse> {
    await this.prepare(through)
    const records = await this.data.list<StoredWorkspaceEvent>({
      prefix: CHAT_EVENT_PREFIX,
      startAfter: chatEventKey(after),
      end: `${chatEventKey(through)}\u0000`,
      limit: PAGE_SIZE,
    })
    const events: WorkspaceEventEnvelope[] = []
    let last = after
    for (const stored of records.values()) {
      if (stored.eventNumber > through) break
      last = stored.eventNumber
      if (
        sessionId !== undefined &&
        (!('event' in stored) || !inSession(stored.event, sessionId))
      )
        continue
      const envelope = await this.compaction.project(
        await loadHistoryEvent(this.data, stored),
        through,
      )
      if (envelope) events.push(envelope)
    }
    const hasMore = records.size === PAGE_SIZE && last < through
    if (hasMore)
      return {
        events,
        throughEventNumber: through,
        hasMore: true,
        nextAfterEventNumber: last,
      }
    return { events, throughEventNumber: through }
  }
}
