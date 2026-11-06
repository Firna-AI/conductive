import type { Session } from '../../shared/sessions'
import { sessionState, type ChatSnapshot } from './chat-snapshot'
import type { ChatContext } from './context'
import { moveDraft } from './drafts'
import { versionOf } from './session-records'
import { placeSession, viewShowing } from './sessions'

/**
 * A model change of the other agent, which opens a session under the ID that
 * the client chose. It waits in the context under that ID until the new
 * session first shows, from the ordered stream or from the reply, whichever
 * comes first. That snapshot moves the draft, so a later record or reply
 * never moves a draft again.
 */
export interface PendingMove {
  /** The session whose draft moves. */
  from: string
  /** The number of the pick. Only the newest pick of a session moves its draft. */
  pick: number
  /** The identity of the draft that moved, or null while none moved. */
  moved: string | null
}

/** A move that one snapshot makes: the draft, and the focus to an open session. */
export interface DraftMove {
  from: string
  to: string
  open: boolean
  freshId: string
}

/**
 * Takes the waiting moves of the sessions that these records show for the
 * first time. The move of an older pick ends too: its session shows as a
 * tab, but it takes neither the draft nor the focus.
 */
export function claimMoves(
  context: ChatContext,
  records: Iterable<Session>,
): DraftMove[] {
  const moves: DraftMove[] = []
  for (const record of records) {
    const pending = context.moves.get(record.id)
    if (!pending) continue
    context.moves.delete(record.id)
    if (context.picks.get(pending.from) !== pending.pick) continue
    pending.moved = sessionState(context.store.get(), pending.from).draft.id
    moves.push({
      from: pending.from,
      to: record.id,
      open: record.closedAt === null,
      freshId: context.newDraftId(),
    })
  }
  return moves
}

/** The snapshot with each draft in its new session, and an open one shown. */
export function applyMoves(
  snapshot: ChatSnapshot,
  moves: readonly DraftMove[],
): ChatSnapshot {
  let next = snapshot
  for (const move of moves) {
    next = moveDraft(next, move)
    if (!move.open) continue
    next = {
      ...next,
      activeSessionId: move.to,
      view: viewShowing(next.view, move.to),
      overlay: { kind: 'none' },
    }
  }
  return next
}

/** Saves the view when a move showed its session. */
export function saveMovedView(
  context: ChatContext,
  moves: readonly DraftMove[],
): void {
  if (!moves.some((move) => move.open)) return
  const { view } = context.store.get()
  if (view) context.saveView(view)
}

/**
 * Shows the session that the reply of a model change opened, when the stream
 * has not shown it yet, and moves its draft in the same snapshot. Says
 * whether the focus moved to it.
 */
export function showOpened(context: ChatContext, record: Session): boolean {
  if (!context.live() || versionOf(context, record.id) !== 0) return false
  const moves = claimMoves(context, [record])
  context.store.update((snapshot) =>
    applyMoves(placeSession(snapshot, record), moves),
  )
  saveMovedView(context, moves)
  return moves.some((move) => move.open)
}
