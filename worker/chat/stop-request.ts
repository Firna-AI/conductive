import type { TurnStopRequester } from '../../src/shared/session-stop'
import type { ChatTransaction } from './store'
import type { StoredTurn } from './types'
import { invalidateSessionWatches } from './session-watch-stop'

export async function firstStopRequester(
  transaction: ChatTransaction,
  turn: StoredTurn,
): Promise<TurnStopRequester | undefined> {
  if (turn.stopRequest !== undefined) return turn.stopRequest ?? undefined
  if (turn.state === 'queued' || turn.state === 'running') return undefined
  let after = 0
  for (;;) {
    const page = await transaction.history(after, transaction.eventNumber, {
      sessionId: turn.sessionId,
    })
    for (const { event } of page.events) {
      if (event.type === 'turn.stop-requested' && event.turnId === turn.id) {
        return event.requestedBySession !== undefined
          ? { requestedBySession: event.requestedBySession }
          : { requestedById: event.requestedById }
      }
    }
    if (!page.hasMore) return undefined
    after = page.nextAfterEventNumber
  }
}

export async function recordStopRequest(
  transaction: ChatTransaction,
  turn: StoredTurn,
  requester: TurnStopRequester,
  nonce: string,
): Promise<void> {
  await invalidateSessionWatches(transaction, turn.sessionId, nonce)
  turn.stopRequest ??=
    (await firstStopRequester(transaction, turn)) ?? requester
  await transaction.saveTurn(turn)
  await transaction.emit({
    type: 'turn.stop-requested',
    sessionId: turn.sessionId,
    turnId: turn.id,
    ...requester,
  })
}
