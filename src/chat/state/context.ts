import type { WorkspaceView } from '../../shared/workspace-view'
import { ChatApiError, type ChatApi, type WorkspaceTarget } from '../api/client'
import type { StreamEnvelope } from '../api/read-workspace'
import type { WorkspaceStream } from '../stream/workspace-stream'
import { withSession, type ChatSnapshot, type ChatStore } from './chat-snapshot'
import {
  asSessionEvent,
  chatEventsOf,
  sessionOf,
  SessionLog,
  type ChatEnvelope,
} from './session-log'
import { placeSession } from './sessions'
import type { Transcript } from './transcript'

/** What the chat's actions share: the API, the store, the logs, and the stream. */
export interface ChatContext {
  readonly target: WorkspaceTarget
  readonly api: ChatApi
  readonly store: ChatStore
  readonly stream: WorkspaceStream
  readonly logs: Map<string, SessionLog>
  /** The number of the latest model pick of each session. */
  readonly picks: Map<string, number>
  readonly newId: () => string
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
 * Applies workspace stream events in order: chat events to the log of their
 * session, and records of the workspace, its start, and its sessions.
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
  context.store.update((snapshot) => {
    let next = snapshot
    for (const { event } of envelopes) {
      if (event?.type === 'workspace.updated') {
        next = { ...next, workspace: event.workspace }
      } else if (event?.type === 'workspace.title' && next.workspace) {
        next = { ...next, workspace: { ...next.workspace, name: event.name } }
      } else if (event?.type === 'start.updated') {
        next = { ...next, start: event.start }
      } else if (event?.type === 'session.updated') {
        next = placeSession(next, event.session)
      }
    }
    for (const [id] of changed) {
      next = withTranscript(next, id, logOf(context, id).transcript)
    }
    return next
  })
}

/**
 * Loads the full stored history of a session once, or `again`, and returns
 * the event number that it reaches, or null when it loads nothing. Its events can be older than the stream's cursor,
 * so they go to the session's own log, never through the stream's check.
 */
export async function hydrate(
  context: ChatContext,
  sessionId: string,
  again = false,
): Promise<number | null> {
  const state = context.store.get().sessionStates[sessionId]
  const known = state?.hydration === 'loading' || state?.hydration === 'ready'
  if (known && !again) return null
  const mark = (hydration: 'loading' | 'ready' | 'failed') =>
    context.store.update((snapshot) =>
      withSession(snapshot, sessionId, (current) => ({
        ...current,
        hydration,
      })),
    )
  mark('loading')
  try {
    const history = await context.api.history(sessionId)
    if (!context.live()) return null
    const own = history.envelopes.filter(
      (envelope) => envelope.workspaceId === context.target.workspaceId,
    )
    const log = logOf(context, sessionId)
    log.merge(chatEventsOf(sessionId, own))
    context.store.update((snapshot) =>
      withTranscript(snapshot, sessionId, log.transcript),
    )
    mark('ready')
    return history.throughEventNumber
  } catch {
    if (context.live()) mark('failed')
    return null
  }
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
