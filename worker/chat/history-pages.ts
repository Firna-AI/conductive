import type {
  ChatHistoryResponse,
  NewestChatHistoryResponse,
  WorkspaceEventEnvelope,
} from './workspace-events'
import { jsonBytes } from '../../src/shared/event-limits'
import { HistoryCompaction } from './history-compaction'
import { readNewestHistory } from './history-newest-pages'
import { historySessionOf, SessionHistoryIndex } from './history-session-index'
import { readSessionHistory } from './history-session-records'
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

/** The limits that end a newest-first page of the history. */
export interface PageLimits {
  /** The most stored events that the page reads from the session. */
  scan: number
  /** The JSON bytes of shown events that end the page. */
  bytes: number
}

/**
 * A page of one session for a history request of the browser. Each page
 * costs the browser a round trip. The scan limit bounds the index reads
 * in the serial chat queue. The byte limit bounds the reply, which still
 * holds one event.
 */
const BROWSER_PAGE_LIMITS: PageLimits = {
  scan: 2_048,
  bytes: 4_194_304,
}

/** The session whose events the page shows. */
export interface SessionPage {
  sessionId: string
}

/** What a forward read shows and spends. */
export interface ReadScope {
  /** The session whose events the page shows. Without it, every event shows. */
  sessionId?: string
  /**
   * The UTF-8 JSON bytes that the reads may still show. Each read lowers it,
   * and ends its page after the shown event that uses it up.
   */
  budget?: { bytes: number }
}

/** The index keeps replacement identities without retaining event payloads. */
export class HistoryPages {
  private readonly data: ChatData
  private readonly compaction: HistoryCompaction
  private readonly sessions: SessionHistoryIndex
  private readonly prepareSession:
    ((through: number) => Promise<void>) | undefined

  constructor(
    data: ChatData,
    prepareSession?: (through: number) => Promise<void>,
  ) {
    this.data = data
    this.prepareSession = prepareSession
    this.compaction = new HistoryCompaction(data)
    this.sessions = new SessionHistoryIndex(data)
  }

  async index(envelope: WorkspaceEventEnvelope): Promise<void> {
    await this.indexCompaction(envelope)
    await this.sessions.index(envelope)
  }

  private async indexCompaction(
    envelope: WorkspaceEventEnvelope,
  ): Promise<void> {
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
        await this.indexCompaction(await loadHistoryEvent(this.data, stored))
        after = stored.eventNumber
      }
      if (after === previous) break
    }
    await this.data.put(INDEX_THROUGH, through)
    await this.data.put(POSITION_THROUGH, through)
  }

  /** Builds at most one storage page, with progress committed by the caller. */
  async prepareSessionBatch(through: number): Promise<boolean> {
    const compacted = Math.min(
      (await this.data.get<number>(INDEX_THROUGH)) ?? 0,
      (await this.data.get<number>(POSITION_THROUGH)) ?? 0,
    )
    let after = Math.min(compacted, await this.sessions.through())
    if (after >= through) return true
    const records = await this.list(after, through)
    for (const stored of records) {
      if (stored.eventNumber > compacted)
        await this.indexCompaction(await loadHistoryEvent(this.data, stored))
      if ('event' in stored) await this.sessions.add(stored)
      after = stored.eventNumber
    }
    const done = records.length < PAGE_SIZE || after >= through
    if (done) after = through
    await this.sessions.advance(after)
    if (after > compacted) {
      await this.data.put(INDEX_THROUGH, after)
      await this.data.put(POSITION_THROUGH, after)
    }
    return done
  }

  async sessionIndexReady(through: number): Promise<boolean> {
    const progress = await Promise.all([
      this.data.get<number>(INDEX_THROUGH),
      this.data.get<number>(POSITION_THROUGH),
      this.sessions.through(),
    ])
    return progress.every((number) => (number ?? 0) >= through)
  }

  private async prepareSessionIndex(through: number): Promise<void> {
    if (this.prepareSession) return this.prepareSession(through)
    while (!(await this.prepareSessionBatch(through))) {
      // Callers with a chat queue supply preparation that yields between batches.
    }
  }

  /** Prepares compaction through one cutoff, then reads a session backwards. */
  async readNewest(
    before: number | undefined,
    through: number,
    session: SessionPage & { limits?: PageLimits },
  ): Promise<NewestChatHistoryResponse> {
    await this.prepareSessionIndex(through)
    return readNewestHistory(
      this.data,
      session.sessionId,
      before,
      through,
      session.limits ?? BROWSER_PAGE_LIMITS,
      (stored) => this.shown(stored, through),
    )
  }

  /**
   * Reads one storage list after `after`, through `through`. The events
   * socket, workspace summary, Continue, and transcript copy use this read.
   * A session filter reads the session index instead of the workspace list.
   * A budget ends a page of the workspace list after the shown event that
   * uses it up. The replay of a tab, which spends a budget, has no filter.
   */
  async read(
    after: number,
    through: number,
    scope: ReadScope = {},
    prepareIndex = true,
  ): Promise<ChatHistoryResponse> {
    const { sessionId } = scope
    // A legacy stop lookup inside an event transaction cannot yield for a build.
    if (
      sessionId !== undefined &&
      (prepareIndex || (await this.sessionIndexReady(through)))
    ) {
      await this.prepareSessionIndex(through)
      return readSessionHistory(
        this.data,
        sessionId,
        after,
        through,
        (stored) => this.shown(stored, through),
      )
    }
    await this.prepare(through)
    const events: WorkspaceEventEnvelope[] = []
    const records = await this.list(after, through)
    let last = after
    let more = records.length === PAGE_SIZE
    for (const [index, stored] of records.entries()) {
      if (stored.eventNumber > through) {
        more = false
        break
      }
      last = stored.eventNumber
      const envelope = await this.shown(stored, through, sessionId)
      if (!envelope) continue
      events.push(envelope)
      if (!scope.budget) continue
      scope.budget.bytes -= jsonBytes(envelope)
      if (scope.budget.bytes > 0) continue
      more ||= index < records.length - 1
      break
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
      (!('event' in stored) || historySessionOf(stored.event) !== sessionId)
    )
      return null
    return this.compaction.project(
      await loadHistoryEvent(this.data, stored),
      through,
    )
  }
}
