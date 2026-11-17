import type { Session } from '../../shared/generated/Session'
import type { AgentChoice } from '../../shared/generated/AgentChoice'
import type { ChangeModelRequest } from '../../shared/sessions'
import { sessionState, type ChatSnapshot } from './chat-snapshot'
import type { ChatContext } from './context'
import { moveDraft } from './drafts'
import { placeSentSession } from './sent-session-place'
import { shownSessionId } from './pane-selection'

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
  /**
   * The request of the change, with the session ID that the client chose. A
   * retry sends it again as it was, so the server takes it as the same change.
   */
  readonly request: ChangeModelRequest
  /** The number of the pick. Only the newest pick of a session moves its draft. */
  pick: number
  /** The identity of the draft that moved, or null while none moved. */
  moved: string | null
}

/**
 * The waiting change of a session to a model. A change waits from its
 * request until its record shows or the server refuses it, also after a
 * failure with no answer.
 */
export function waitingMove(
  context: ChatContext,
  from: string,
  choice: AgentChoice,
): PendingMove | null {
  for (const move of context.moves.values()) {
    const { agent, model, effort } = move.request.choice
    const same =
      agent === choice.agent &&
      model === choice.model &&
      effort === choice.effort
    if (move.from === from && same) return move
  }
  return null
}

/** A move that one snapshot makes: the draft, and the focus to an open session. */
export interface DraftMove {
  from: string
  to: string
  open: boolean
  freshId: string
  /** An older model pick still places its session but moves no draft or selection. */
  draft: boolean
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
    const latest = context.picks.get(pending.from) === pending.pick
    if (latest)
      pending.moved = sessionState(context.store.get(), pending.from).draft.id
    moves.push({
      from: pending.from,
      to: record.id,
      open: record.closedAt === null,
      freshId: context.newDraftId(),
      draft: latest,
    })
  }
  return moves
}

/** Moves each draft and selects its open target while its source stays selected. */
export function applyMoves(
  snapshot: ChatSnapshot,
  moves: readonly DraftMove[],
): ChatSnapshot {
  let next = snapshot
  for (const move of moves) {
    if (move.draft) next = moveDraft(next, move)
    if (!move.open) continue
    const selected = [
      shownSessionId(next, 0),
      shownSessionId(next, 1),
    ].includes(move.from)
    next = {
      ...next,
      view: placeSentSession(next.view, move.from, move.to, move.draft),
      overlay: move.draft && selected ? { kind: 'none' } : next.overlay,
    }
  }
  return next
}

/** Saves the source-row placement and selection of each open moved session. */
export function saveMovedView(
  context: ChatContext,
  moves: readonly DraftMove[],
): void {
  const { view } = context.store.get()
  if (!moves.some((move) => move.open)) return
  if (view) context.saveView(view)
}
