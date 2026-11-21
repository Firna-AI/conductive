import type { Session } from '../../shared/generated/Session'
import type { ChatEnvelope } from '../../shared/transcript/session-events'
import type { PlacedRecord } from '../../shared/transcript/session-log'
import type { ChatSnapshot } from './chat-snapshot'
import type { ChatContext } from './context'
import { placeSession } from './sessions'

export interface SessionChange {
  record: PlacedRecord | null
  apply: (snapshot: ChatSnapshot) => ChatSnapshot
}

/** One paged input whose records publish their final tab placement together. */
export interface SessionReplay {
  merge: (sessionId: string, events: readonly ChatEnvelope[]) => SessionChange
  finish: (publish?: boolean) => void
}

const replays = new WeakMap<
  ChatContext,
  { active: Set<Set<string>>; ready: Set<string> }
>()
const placements = new WeakMap<ChatContext, Map<string, PlacedRecord>>()

/** Records and tab placement advance separately while stored pages load. */
export function publishPlacement(
  context: ChatContext,
  record: PlacedRecord,
): boolean {
  let own = placements.get(context)
  if (!own) {
    own = new Map()
    placements.set(context, own)
  }
  const before = own.get(record.session.id)
  if (before && before.eventNumber >= record.eventNumber) return false
  own.set(record.session.id, record)
  return true
}

/** Pending closes override the published placement until confirmation or failure. */
export function placementOf(
  context: ChatContext,
  session: Session,
): Session | null {
  const placed = placements.get(context)?.get(session.id)
  if (!placed) return null
  const closedAt = (context.edits.get(session.id) ?? []).reduce(
    (closed, edit) =>
      edit.change.closedAt === undefined ? closed : edit.change.closedAt,
    placed.session.closedAt,
  )
  return { ...session, closedAt }
}

/** Updates record fields without changing tab membership, order, or selection. */
export function withCurrentFields(
  snapshot: ChatSnapshot,
  session: Session,
): ChatSnapshot {
  const replace = (items: readonly Session[]) =>
    items.map((item) => (item.id === session.id ? session : item))
  return {
    ...snapshot,
    sessions: replace(snapshot.sessions),
    history: replace(snapshot.history),
  }
}

/** Places the current fields according to the last published navigation. */
export function placeCurrent(
  context: ChatContext,
  snapshot: ChatSnapshot,
  session: Session,
): ChatSnapshot {
  const placed = placementOf(context, session)
  return withCurrentFields(
    placed ? placeSession(snapshot, placed) : snapshot,
    session,
  )
}

/** The record owner supplies the writes and the final placement. */
export function recordReplay(
  context: ChatContext,
  merge: SessionReplay['merge'],
  place: (
    snapshot: ChatSnapshot,
    sessionIds: readonly string[],
  ) => ChatSnapshot,
): SessionReplay {
  let state = replays.get(context)
  if (!state) {
    state = { active: new Set(), ready: new Set() }
    replays.set(context, state)
  }
  const { active, ready } = state
  const records = new Set<string>()
  active.add(records)
  return {
    merge: (sessionId, events) => {
      const change = merge(sessionId, events)
      if (change.record) records.add(sessionId)
      return change
    },
    finish: (publish = true) => {
      if (!active.delete(records)) return
      if (publish) for (const id of records) ready.add(id)
      if (active.size > 0 || !context.live()) return
      const ids = [...ready]
      ready.clear()
      if (ids.length === 0) return
      context.store.update((snapshot) => place(snapshot, ids))
    },
  }
}
