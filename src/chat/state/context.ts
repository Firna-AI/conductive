import type { Session } from '../../shared/sessions'
import type { WorkspaceView } from '../../shared/workspace-view'
import { ChatApiError, type ChatApi, type WorkspaceTarget } from '../api/client'
import type { StreamEnvelope } from '../api/read-workspace'
import type { WorkspaceStream } from '../stream/workspace-stream'
import { withSession, type ChatSnapshot, type ChatStore } from './chat-snapshot'
import {
  applyMoves,
  claimMoves,
  saveMovedView,
  type PendingMove,
} from './model-moves'
import {
  asSessionEvent,
  sessionOf,
  SessionLog,
  type ChatEnvelope,
} from './session-log'
import {
  beginChange,
  WORKSPACE_RECORD,
  type RecordKey,
} from './session-records'
import { placeSession } from './sessions'
import type { Transcript } from './transcript'

/** What the chat's actions share: the API, the store, the logs, and the stream. */
export interface ChatContext {
  readonly target: WorkspaceTarget
  readonly api: ChatApi
  readonly store: ChatStore
  readonly stream: WorkspaceStream
  readonly logs: Map<string, SessionLog>
  /** The running history load of each session, so that loads are shared. */
  readonly loading: Map<string, Promise<number | null>>
  /** The local version of each record, as `session-records.ts` says. */
  readonly versions: Map<RecordKey, number>
  /** The number of the latest model pick of each session. */
  readonly picks: Map<string, number>
  /** The model changes whose new session has not shown yet, by its ID. */
  readonly moves: Map<string, PendingMove>
  readonly newId: () => string
  /** A new identity for a draft that a session starts after its draft moved. */
  readonly newDraftId: () => string
  readonly saveView: (view: WorkspaceView) => void
  /** The chat is still open. A response that arrives later changes nothing. */
  readonly live: () => boolean
}

export function logOf(context: ChatContext, sessionId: string): SessionLog {
  const known = context.logs.get(sessionId)
  if (known) return known
  const log = new SessionLog()
  context.logs.set(sessionId, log)
  return log
}

const RETRY_MESSAGE = 'The request failed. Try again.'

export function messageOf(error: unknown): string {
  return error instanceof ChatApiError ? error.message : RETRY_MESSAGE
}

export function showNotice(
  context: ChatContext,
  sessionId: string | null,
  title: string,
  error: unknown,
): void {
  if (!context.live()) return
  context.store.update((snapshot) => ({
    ...snapshot,
    notice: { sessionId, title, message: messageOf(error) },
  }))
}

/** Shows a new transcript, and drops sent messages that it now holds. */
export function withTranscript(
  snapshot: ChatSnapshot,
  sessionId: string,
  transcript: Transcript,
): ChatSnapshot {
  const shown = new Set(
    transcript.items.flatMap((item) =>
      item.kind === 'user' ? [item.message.id] : [],
    ),
  )
  return withSession(snapshot, sessionId, (state) => ({
    ...state,
    transcript,
    pending: state.pending.filter((message) => !shown.has(message.id)),
    stopping: transcript.turn ? state.stopping : false,
  }))
}

/**
 * The last record of each session in a batch of the stream, in the order of
 * those last records. A batch, such as the history after a reconnect, then
 * shows only where each session ends. An older close in the batch can then
 * not move the focus away from a session that the batch leaves open.
 */
function lastRecords(
  envelopes: readonly StreamEnvelope[],
): Map<string, Session> {
  const records = new Map<string, Session>()
  for (const { event } of envelopes) {
    if (event?.type !== 'session.updated') continue
    records.delete(event.session.id)
    records.set(event.session.id, event.session)
  }
  return records
}

const changesWorkspace = (event: StreamEnvelope['event']) =>
  event?.type === 'workspace.updated' ||
  event?.type === 'workspace.title' ||
  event?.type === 'start.updated'

/**
 * Applies workspace stream events in order: chat events to the log of their
 * session, and records of the workspace, its start, and its sessions. A
 * record from the stream starts a new version of its session, and an event
 * of the workspace or its start a new version of the workspace record, so an
 * older reply no longer applies. The first record of a session that a model
 * change opens moves the draft in the same snapshot.
 */
export function applyEnvelopes(
  context: ChatContext,
  envelopes: readonly StreamEnvelope[],
): void {
  const bySession = new Map<string, ChatEnvelope[]>()
  for (const { eventNumber, occurredAt, event } of envelopes) {
    const chat = asSessionEvent(event)
    if (!chat) continue
    const events = bySession.get(sessionOf(chat)) ?? []
    events.push({ eventNumber, occurredAt, event: chat })
    bySession.set(sessionOf(chat), events)
  }
  const changed = [...bySession].filter(([id, events]) =>
    logOf(context, id).merge(events),
  )
  const records = lastRecords(envelopes)
  for (const id of records.keys()) beginChange(context, id)
  const moves = claimMoves(context, records.values())
  if (envelopes.some(({ event }) => changesWorkspace(event))) {
    beginChange(context, WORKSPACE_RECORD)
  }
  context.store.update((snapshot) => {
    let next = snapshot
    for (const { event } of envelopes) {
      if (event?.type === 'workspace.updated') {
        next = { ...next, workspace: event.workspace }
      } else if (event?.type === 'workspace.title' && next.workspace) {
        next = { ...next, workspace: { ...next.workspace, name: event.name } }
      } else if (event?.type === 'start.updated') {
        next = { ...next, start: event.start }
      }
    }
    for (const record of records.values()) next = placeSession(next, record)
    next = applyMoves(next, moves)
    for (const [id] of changed) {
      next = withTranscript(next, id, logOf(context, id).transcript)
    }
    return next
  })
  saveMovedView(context, moves)
}

/** Saves the view one request at a time. A newer view replaces one that waits. */
export function viewWriter(
  save: (view: WorkspaceView) => Promise<unknown>,
): (view: WorkspaceView) => void {
  let waiting: WorkspaceView | null = null
  let writing = false
  const flush = async () => {
    if (writing || !waiting) return
    const view = waiting
    waiting = null
    writing = true
    try {
      await save(view)
    } catch {
      // The next change sends the whole view again.
    } finally {
      writing = false
      void flush()
    }
  }
  return (view) => {
    waiting = view
    void flush()
  }
}
