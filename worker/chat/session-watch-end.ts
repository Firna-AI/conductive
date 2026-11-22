import type { SessionWatchEndState } from '../../src/shared/generated/SessionWatchEndState'
import type { TurnEndReason } from '../../src/shared/generated/TurnEndReason'
import type { ChatTransaction } from './store'
import type { StoredTurn } from './types'

export function watchEnd(
  state: StoredTurn['state'],
): SessionWatchEndState | null {
  return state === 'finished' || state === 'failed' || state === 'stopped'
    ? state
    : null
}

/** Older Workers retained the safe reason in history but not in their turn record. */
async function retainedReason(
  view: ChatTransaction,
  turn: StoredTurn,
): Promise<TurnEndReason | null> {
  if (turn.endReason) return turn.endReason
  let after = 0
  for (;;) {
    const page = await view.history(after, view.eventNumber, {
      sessionId: turn.sessionId,
    })
    for (const { event, late } of page.events)
      if (
        !late &&
        event.type === 'turn.completed' &&
        event.turnId === turn.id &&
        event.endReason
      )
        return event.endReason
    if (!page.hasMore) return null
    after = page.nextAfterEventNumber
  }
}

/** Called with the final normalized turn in the same terminal transaction. */
export async function readySessionWatches(
  view: ChatTransaction,
  turn: StoredTurn,
) {
  const state = watchEnd(turn.state)
  if (!state) return
  const pending = (await view.watches.activeTargets()).filter(
    (watch) => watch.stage === 'pending' && watch.turnId === turn.id,
  )
  if (!pending.length) return
  const reason = await retainedReason(view, turn)
  if (reason && !turn.endReason) {
    turn.endReason = reason
    await view.saveTurn(turn)
  }
  for (const watch of pending)
    await view.watches.saveTarget({ ...watch, stage: 'ready', state, reason })
}
