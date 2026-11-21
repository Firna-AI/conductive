import type { Session } from '../generated/Session'
import type { TranscriptBatch } from './transcript-batch'
import { endLostTurn } from './turn-events'

/** Ends a known turn after a record or refusal says that its work ended. */
export function endShownTurn(fold: TranscriptBatch, turnId: string): void {
  endLostTurn(fold, turnId)
  fold.turns.end(turnId)
}

/** The started active turn, with the time stored in its session record. */
export function startedTurn(
  session: Pick<Session, 'activeTurnId' | 'activeTurnStartedAt'>,
): { turnId: string; startedAt: number } | null {
  const { activeTurnId, activeTurnStartedAt } = session
  if (activeTurnId === null || activeTurnStartedAt === null) return null
  return { turnId: activeTurnId, startedAt: activeTurnStartedAt }
}

/** Applies a session record at its place among the events. */
export function foldRecord(
  fold: TranscriptBatch,
  session: Pick<
    Session,
    'activeTurnId' | 'activeTurnStartedAt' | 'retryMessageId'
  >,
): boolean {
  let changed = false
  for (const id of fold.turns.active) {
    if (id !== session.activeTurnId) {
      endShownTurn(fold, id)
      changed = true
    }
  }
  const started = startedTurn(session)
  if (started !== null) {
    const known = fold.turns.get(started.turnId)
    if (!known) {
      changed = true
      fold.turns.add(started.turnId)
      fold.items.noteTurn(started.turnId)
      fold.turn = { ...started, choice: null, thinking: false }
    } else if (
      !known.ended &&
      fold.turn?.turnId === started.turnId &&
      fold.turn.startedAt !== started.startedAt
    ) {
      changed = true
      fold.turn = { ...fold.turn, startedAt: started.startedAt }
    }
  }
  changed ||= fold.retryMessageId !== session.retryMessageId
  fold.retryMessageId = session.retryMessageId
  return changed
}
