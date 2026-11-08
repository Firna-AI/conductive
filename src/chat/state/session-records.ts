import type { Session } from '../../shared/sessions'
import type {
  OrderedWorkspaceResponse,
  Workspace,
  WorkspaceStart,
} from '../../shared/workspaces'
import type { ChatSnapshot } from './chat-snapshot'
import { withTranscript, type ChatContext } from './context'
import { noteFirstStart, withFirstStart } from './first-start'
import { applyMoves, claimMoves, saveMovedView } from './model-moves'
import { SessionLog, type ChatEnvelope, type PlacedRecord } from './session-log'
import { placeSession } from './sessions'

/**
 * The order of the records that a reply and the stream both write: each
 * session record, and the workspace record with its start steps. Each
 * reply, read, and event carries the workspace event number of its state,
 * so the newest number wins, whatever arrives first. The session log of
 * each session keeps its newest record, as `SessionLog.record` says.
 *
 * A rename or a model change of the same agent shows at once as a pending
 * edit over the newest record. A confirmed edit retires itself and older
 * edits of its field. A failed edit retires only itself. Other edits stay.
 * The owner alone writes session logs and publishes their newest records.
 */

const logs = new WeakMap<ChatContext, Map<string, SessionLog>>()

function writableLogOf(context: ChatContext, sessionId: string): SessionLog {
  let own = logs.get(context)
  if (!own) {
    own = new Map()
    logs.set(context, own)
  }
  let log = own.get(sessionId)
  if (!log) {
    log = new SessionLog()
    own.set(sessionId, log)
  }
  return log
}

/** Read access to one session's log. Its writes stay with this owner. */
export function logOf(
  context: ChatContext,
  sessionId: string,
): Pick<SessionLog, 'record' | 'transcript' | 'times'> {
  return writableLogOf(context, sessionId)
}

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
function placeShown(
  context: ChatContext,
  snapshot: ChatSnapshot,
  sessionId: string,
): ChatSnapshot {
  const record = shownRecord(context, sessionId)
  return record === null ? snapshot : placeSession(snapshot, record)
}

/** The snapshot with the shown record of a session and its transcript. */
function withRecord(
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
  if (!writableLogOf(context, session.id).offer(session, eventNumber))
    return false
  const moves = claimMoves(context, [session])
  context.store.update((snapshot) =>
    applyMoves(withRecord(context, snapshot, session.id), moves),
  )
  saveMovedView(context, moves)
  return true
}

/**
 * Merges a session's events and gives their snapshot change. A repeated or
 * older record changes no tabs, so local tabs of an archived reader stay.
 */
export function mergeSession(
  context: ChatContext,
  sessionId: string,
  events: readonly ChatEnvelope[],
): {
  record: PlacedRecord | null
  apply: (snapshot: ChatSnapshot) => ChatSnapshot
} {
  const log = writableLogOf(context, sessionId)
  const before = log.record
  const changed = log.merge(events)
  const record = log.record !== before ? log.record : null
  return {
    record,
    apply: (snapshot) =>
      !changed
        ? snapshot
        : withTranscript(
            record ? placeShown(context, snapshot, sessionId) : snapshot,
            sessionId,
            log.transcript,
            log.times,
          ),
  }
}

/** Shows a pending edit and gives separate confirmation and failure steps. */
export function beginEdit(
  context: ChatContext,
  sessionId: string,
  change: PendingEdit['change'],
): {
  confirm: (session: Session, eventNumber: number) => void
  fail: () => void
} {
  const edit: PendingEdit = { change }
  context.edits.set(sessionId, [...(context.edits.get(sessionId) ?? []), edit])
  context.store.update((snapshot) => placeShown(context, snapshot, sessionId))
  const retire = (confirmed: boolean) => {
    const pending = context.edits.get(sessionId) ?? []
    const at = pending.indexOf(edit)
    if (at < 0) return false
    const rest = pending.filter(
      (item, index) =>
        item !== edit &&
        (!confirmed ||
          index > at ||
          !Object.keys(change).some((field) => field in item.change)),
    )
    if (rest.length > 0) context.edits.set(sessionId, rest)
    else context.edits.delete(sessionId)
    return true
  }
  return {
    confirm: (session, eventNumber) => {
      if (!context.live()) return
      const changed = writableLogOf(context, sessionId).offer(
        session,
        eventNumber,
      )
      const retired = retire(true)
      if (changed || retired) {
        context.store.update((snapshot) =>
          withRecord(context, snapshot, sessionId),
        )
      }
    },
    fail: () => {
      const retired = retire(false)
      if (!context.live() || !retired) return
      context.store.update((snapshot) =>
        placeShown(context, snapshot, sessionId),
      )
    },
  }
}

/**
 * Shows the workspace record and the start steps of a read or a reply when
 * no newer state of them has shown, and says whether they showed. An older
 * one still counts for the first start, whose success the chat remembers.
 */
export function confirmWorkspace(
  context: ChatContext,
  reply: Pick<OrderedWorkspaceResponse, 'workspace' | 'start' | 'eventNumber'>,
): boolean {
  if (!context.live()) return false
  const newer = reply.eventNumber >= context.workspaceOrder.through
  if (newer) context.workspaceOrder.through = reply.eventNumber
  context.store.update((snapshot) =>
    newer
      ? withFirstStart({
          ...snapshot,
          workspace: reply.workspace,
          start: reply.start,
        })
      : noteFirstStart(snapshot, reply.workspace, reply.start),
  )
  return newer
}

/** A change of the workspace record from the stream, at its number. */
export type WorkspaceChange =
  | { type: 'workspace.updated'; workspace: Workspace }
  | { type: 'workspace.title'; name: string }
  | { type: 'start.updated'; start: WorkspaceStart }

/**
 * The snapshot after a change of the workspace record from the stream. A
 * change that is not newer than the record that shows changes nothing but
 * the success of the first start.
 */
export function withWorkspaceChange(
  context: ChatContext,
  snapshot: ChatSnapshot,
  change: WorkspaceChange,
  eventNumber: number,
): ChatSnapshot {
  if (eventNumber <= context.workspaceOrder.through) {
    return change.type === 'workspace.updated'
      ? noteFirstStart(snapshot, change.workspace, null)
      : change.type === 'start.updated'
        ? noteFirstStart(snapshot, null, change.start)
        : snapshot
  }
  context.workspaceOrder.through = eventNumber
  switch (change.type) {
    case 'workspace.updated':
      return withFirstStart({ ...snapshot, workspace: change.workspace })
    case 'start.updated':
      return withFirstStart({ ...snapshot, start: change.start })
    case 'workspace.title':
      return snapshot.workspace
        ? {
            ...snapshot,
            workspace: { ...snapshot.workspace, name: change.name },
          }
        : snapshot
  }
}
