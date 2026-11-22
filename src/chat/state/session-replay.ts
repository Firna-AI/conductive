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
  finish: () => void
}

const replays = new WeakMap<ChatContext, Set<symbol>>()
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

/** Places current fields while preserving held or local navigation. */
export function placeCurrent(
  context: ChatContext,
  snapshot: ChatSnapshot,
  session: Session,
): ChatSnapshot {
  if (snapshot.archiveTabs !== null) return placeSession(snapshot, session)
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
  place: (snapshot: ChatSnapshot) => ChatSnapshot,
): SessionReplay {
  const active = replays.get(context) ?? new Set<symbol>()
  replays.set(context, active)
  const replay = Symbol()
  active.add(replay)
  return {
    merge,
    finish: () => {
      if (!active.delete(replay) || active.size > 0 || !context.live()) return
      context.store.update(place)
    },
  }
}
