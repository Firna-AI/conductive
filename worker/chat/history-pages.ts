import type {
  ChatHistoryResponse,
  NewestChatHistoryResponse,
  WorkspaceEventEnvelope,
  WorkspaceEvent,
} from './workspace-events'
import { HistoryCompaction } from './history-compaction'
import { readNewestHistory } from './history-newest-pages'
import {
  deleteHistoryEvent,
  loadHistoryEvent,
  type StoredWorkspaceEvent,
} from './history-storage'
import { CHAT_EVENT_PREFIX, chatEventKey, chatKey } from './storage-keys'
import type { ChatData } from './types'

/** One storage list reads at most this many stored events. */
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

/** The limits that end a newest-first page of the history. */
export interface PageLimits {
  /** The most stored events that the page reads, of every session. */
  scan: number
  /** The JSON bytes of shown events that end the page. */
  bytes: number
}

/**
 * A page of one session for a history request of the browser. Each page
 * costs the browser a round trip, so the page reads on past the events of
 * other sessions and the file reports. The scan limit keeps the read short
 * in the serial chat queue. The byte limit bounds the reply, which still
 * holds one event.
 */
export const BROWSER_PAGE_LIMITS: PageLimits = {
  scan: 2_048,
  bytes: 4_194_304,
}

/** The session whose events the page shows. */
export interface SessionPage {
  sessionId: string
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

  /** Prepares compaction through one cutoff, then reads a session backwards. */
  async readNewest(
    before: number | undefined,
    through: number,
    session: SessionPage & { limits?: PageLimits },
  ): Promise<NewestChatHistoryResponse> {
    await this.prepare(through)
    return readNewestHistory(
      this.data,
      before,
      through,
      session.limits ?? BROWSER_PAGE_LIMITS,
      (stored) => this.shown(stored, through, session.sessionId),
    )
  }

  /**
   * Reads one storage list after `after`, through `through`. The events
   * socket, workspace summary, Continue, and transcript copy use this read.
   * A session filter keeps only that session's events in the list.
   */
  async read(
    after: number,
    through: number,
    session?: SessionPage,
  ): Promise<ChatHistoryResponse> {
    await this.prepare(through)
    const events: WorkspaceEventEnvelope[] = []
    const records = await this.list(after, through)
    let last = after
    let more = records.length === PAGE_SIZE
    for (const stored of records) {
      if (stored.eventNumber > through) {
        more = false
        break
      }
      last = stored.eventNumber
      const envelope = await this.shown(stored, through, session?.sessionId)
      if (envelope) events.push(envelope)
    }
    if (!more || last >= through) return { events, throughEventNumber: through }
    return {
      events,
      throughEventNumber: through,
      hasMore: true,
      nextAfterEventNumber: last,
    }
  }

  /** The next stored events after `after`, through `through`, in order. */
  private async list(
    after: number,
    through: number,
  ): Promise<StoredWorkspaceEvent[]> {
    const records = await this.data.list<StoredWorkspaceEvent>({
      prefix: CHAT_EVENT_PREFIX,
      startAfter: chatEventKey(after),
      end: `${chatEventKey(through)}\u0000`,
      limit: PAGE_SIZE,
    })
    return [...records.values()]
  }

  /** The envelope that a page shows for a stored event, or null. */
  private async shown(
    stored: StoredWorkspaceEvent,
    through: number,
    sessionId?: string,
  ): Promise<WorkspaceEventEnvelope | null> {
    if (
      sessionId !== undefined &&
      (!('event' in stored) || !inSession(stored.event, sessionId))
    )
      return null
    return this.compaction.project(
      await loadHistoryEvent(this.data, stored),
      through,
    )
  }
}
