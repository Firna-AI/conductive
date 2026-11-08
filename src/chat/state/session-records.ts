import type { Session } from '../../shared/sessions'
import type {
  OrderedWorkspaceResponse,
  Workspace,
  WorkspaceStart,
} from '../../shared/workspaces'
import type { ChatSnapshot } from './chat-snapshot'
import { logOf, withTranscript, type ChatContext } from './context'
import { placeSession } from './sessions'

/**
 * The order of the records that a reply and the stream both write: each
 * session record, and the workspace record with its start steps. Each
 * reply, read, and event carries the workspace event number of its state,
 * so the newest number wins, whatever arrives first. The session log of
 * each session keeps its newest record, as `SessionLog.record` says.
 *
 * A rename or a model change of the same agent shows at once as a pending
 * edit over the newest record, until its reply confirms it or its request
 * fails. So an older record from the stream never hides it, and a failed
 * edit leaves the other edits and the newest record.
 */

/** A change of a session record that waits for its reply. */
export interface PendingEdit {
  readonly change: Partial<Pick<Session, 'title' | 'choice'>>
}

/** The record of a session that the chat shows: the newest, with its edits. */
export function shownRecord(
  context: ChatContext,
  sessionId: string,
): Session | null {
  const newest = logOf(context, sessionId).record?.session ?? null
  if (newest === null) return null
  const edits = context.edits.get(sessionId) ?? []
  return edits.reduce<Session>(
    (record, edit) => ({ ...record, ...edit.change }),
    newest,
  )
}

/** The snapshot with the shown record of a session in its place. */
export function placeShown(
  context: ChatContext,
  snapshot: ChatSnapshot,
  sessionId: string,
): ChatSnapshot {
  const record = shownRecord(context, sessionId)
  return record === null ? snapshot : placeSession(snapshot, record)
}

/** The snapshot with the shown record of a session and its transcript. */
export function withRecord(
  context: ChatContext,
  snapshot: ChatSnapshot,
  sessionId: string,
): ChatSnapshot {
  const log = logOf(context, sessionId)
  return withTranscript(
    placeShown(context, snapshot, sessionId),
    sessionId,
    log.transcript,
    log.times,
  )
}

/**
 * Takes a session record of a reply or a read, with the event number of its
 * state. It shows when it is the newest record of its session. Says whether
 * it counted.
 */
export function confirmRecord(
  context: ChatContext,
  session: Session,
  eventNumber: number,
): boolean {
  if (!context.live()) return false
  if (!logOf(context, session.id).offer(session, eventNumber)) return false
  context.store.update((snapshot) => withRecord(context, snapshot, session.id))
  return true
}

/**
 * Shows an edit of a session record at once, and gives the function that
 * ends it, after its reply or its failure.
 */
export function beginEdit(
  context: ChatContext,
  sessionId: string,
  change: PendingEdit['change'],
): () => void {
  const edit: PendingEdit = { change }
  context.edits.set(sessionId, [...(context.edits.get(sessionId) ?? []), edit])
  context.store.update((snapshot) => placeShown(context, snapshot, sessionId))
  return () => {
    const rest = (context.edits.get(sessionId) ?? []).filter(
      (item) => item !== edit,
    )
    if (rest.length > 0) context.edits.set(sessionId, rest)
    else context.edits.delete(sessionId)
    if (!context.live()) return
    context.store.update((snapshot) => placeShown(context, snapshot, sessionId))
  }
}

/**
 * Shows the workspace record, its start steps, and its saved error of a
 * read or a reply when no newer state of them has shown, and says whether
 * they showed.
 */
export function confirmWorkspace(
  context: ChatContext,
  reply: Pick<
    OrderedWorkspaceResponse,
    'workspace' | 'start' | 'error' | 'eventNumber'
  >,
): boolean {
  if (!context.live()) return false
  const newer = reply.eventNumber >= context.workspaceOrder.through
  if (!newer) return false
  context.workspaceOrder.through = reply.eventNumber
  context.store.update((snapshot) => ({
    ...snapshot,
    workspace: reply.workspace,
    start: reply.start,
    savedError: reply.error?.message ?? null,
  }))
  return true
}

/**
 * A change of the workspace record from the stream, at its number. An
 * update without `error` keeps the saved error, and null clears it.
 */
export type WorkspaceChange =
  | {
      type: 'workspace.updated'
      workspace: Workspace
      error?: { message: string } | null
    }
  | { type: 'workspace.title'; name: string }
  | { type: 'start.updated'; start: WorkspaceStart }

/**
 * The snapshot after a change of the workspace record from the stream. A
 * change that is not newer than the record that shows changes nothing.
 */
export function withWorkspaceChange(
  context: ChatContext,
  snapshot: ChatSnapshot,
  change: WorkspaceChange,
  eventNumber: number,
): ChatSnapshot {
  if (eventNumber <= context.workspaceOrder.through) return snapshot
  context.workspaceOrder.through = eventNumber
  switch (change.type) {
    case 'workspace.updated':
      return {
        ...snapshot,
        workspace: change.workspace,
        savedError:
          change.error === undefined
            ? snapshot.savedError
            : (change.error?.message ?? null),
      }
    case 'start.updated':
      return { ...snapshot, start: change.start }
    case 'workspace.title':
      return snapshot.workspace
        ? {
            ...snapshot,
            workspace: { ...snapshot.workspace, name: change.name },
          }
        : snapshot
  }
}
