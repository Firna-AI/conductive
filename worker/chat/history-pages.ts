import type {
  ChatHistoryResponse,
  NewestChatHistoryResponse,
  WorkspaceEventEnvelope,
} from './workspace-events'
import { HistoryCompaction } from './history-compaction'
import {
  HISTORY_BATCH_SIZE,
  HISTORY_PAGE_LIMITS,
  readForwardHistory,
} from './history-forward-pages'
import { readNewestHistory } from './history-newest-pages'
import {
  loadChunkedPageEvent,
  type HistoryPageEvent,
} from './history-page-event'
import { historySessionOf, SessionHistoryIndex } from './history-session-index'
import { readSessionHistory } from './history-session-records'
import {
  deleteHistoryEvent,
  loadHistoryEvent,
  type StoredWorkspaceEvent,
} from './history-storage'
import {
  CHAT_EVENT_PREFIX,
  CHAT_META,
  chatEventKey,
  chatKey,
} from './storage-keys'
import type { ChatMetadata } from './store-metadata'
import type { ChatData } from './types'

const INDEX_THROUGH = chatKey('history-index', 'through')
const POSITION_THROUGH = chatKey('history-index', 'positions-through')
const NEWEST_TREE = chatKey('history-index', 'tree')
const NEWEST_CHANGES = chatKey('history-index', 'changes')
const CHANGES_CUTOVER = chatKey('history-index', 'changes-cutover')
const NEWEST_SKILLS = chatKey('history-index', 'skills')

/** The limits that end a newest-first page of the history. */
export interface PageLimits {
  /** The most stored events that the page reads from the session. */
  scan: number
  /** The JSON bytes of shown events that end the page. */
  bytes: number
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
    if (event.type === 'files.snapshot')
      await this.replace(NEWEST_TREE, envelope.eventNumber)
    if (event.type === 'changes.updated')
      await this.indexChanges(envelope.eventNumber)
    // Only the latest skills event holds the lists of the workspace.
    if (event.type === 'skills.updated')
      await this.replace(NEWEST_SKILLS, envelope.eventNumber)
    await this.compaction.index(envelope)
    await this.data.put(INDEX_THROUGH, envelope.eventNumber)
    await this.data.put(POSITION_THROUGH, envelope.eventNumber)
  }

  private async indexChanges(eventNumber: number): Promise<void> {
    let cutover = await this.data.get<number>(CHANGES_CUTOVER)
    if (cutover === undefined) {
      // A page can prepare an older cutoff than the committed workspace tip.
      cutover = (await this.data.get<ChatMetadata>(CHAT_META))?.through ?? 0
      await this.data.put(CHANGES_CUTOVER, cutover)
    }
    if (eventNumber > cutover) await this.replace(NEWEST_CHANGES, eventNumber)
  }

  /** Deletes the older event that a newer full event replaces. */
  private async replace(newest: string, eventNumber: number): Promise<void> {
    const previous = await this.data.get<number>(newest)
    if (previous !== undefined && previous < eventNumber)
      await deleteHistoryEvent(this.data, chatEventKey(previous))
    await this.data.put(newest, eventNumber)
  }

  async prepare(through: number): Promise<void> {
    let after = Math.min(
      (await this.data.get<number>(INDEX_THROUGH)) ?? 0,
      (await this.data.get<number>(POSITION_THROUGH)) ?? 0,
    )
    if (after >= through) return
    while (after < through) {
      const records = await this.list(after, through, HISTORY_BATCH_SIZE)
      const previous = after
      for (const { eventNumber, stored } of records) {
        if (eventNumber > through) break
        await this.indexCompaction(await loadHistoryEvent(this.data, stored))
        after = eventNumber
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
    const records = await this.list(after, through, HISTORY_BATCH_SIZE)
    for (const { eventNumber, stored } of records) {
      if (eventNumber > compacted)
        await this.indexCompaction(await loadHistoryEvent(this.data, stored))
      if ('event' in stored) await this.sessions.add(stored)
      after = eventNumber
    }
    const done = records.length < HISTORY_BATCH_SIZE || after >= through
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
      session.limits ?? HISTORY_PAGE_LIMITS,
      (stored) => this.shown(stored, through),
    )
  }

  /** Reads a bounded page through the cutoff, using the session index when ready. */
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
        scope.budget,
      )
    }
    await this.prepare(through)
    return readForwardHistory(
      after,
      through,
      (last, limit) => this.list(last, through, limit),
      (stored) => this.shown(stored, through, sessionId),
      scope.budget,
    )
  }

  /** The next stored events after `after`, through `through`, in order. */
  private async list(after: number, through: number, limit: number) {
    const records = await this.data.list<StoredWorkspaceEvent>({
      prefix: CHAT_EVENT_PREFIX,
      startAfter: chatEventKey(after),
      end: `${chatEventKey(through)}\u0000`,
      limit,
    })
    return [...records.values()].map((stored) => ({
      eventNumber: stored.eventNumber,
      stored,
    }))
  }

  /** The envelope that a page shows for a stored event, or null. */
  private async shown(
    stored: StoredWorkspaceEvent,
    through: number,
    sessionId?: string,
  ): Promise<HistoryPageEvent | null> {
    if (!('event' in stored))
      return sessionId === undefined
        ? loadChunkedPageEvent(this.data, stored)
        : null
    if (sessionId !== undefined && historySessionOf(stored.event) !== sessionId)
      return null
    const envelope = await this.compaction.project(
      await loadHistoryEvent(this.data, stored),
      through,
    )
    return envelope === null ? null : { envelope }
  }
}
