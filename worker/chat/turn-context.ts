import type { RunnerEventIdentity } from './runner-event-identity'
import type { ChatTransaction } from './store'
import type { StoredTurn } from './types'

async function startedEvidence(
  transaction: ChatTransaction,
  turn: StoredTurn,
): Promise<boolean | undefined> {
  if (turn.started !== undefined) return turn.started
  if (turn.state === 'queued') return false
  if (
    turn.state === 'running' ||
    turn.state === 'stopping' ||
    turn.state === 'finished'
  )
    return true
  for (const id of turn.messageIds) {
    const message = await transaction.message(id)
    if (message?.sessionId === turn.sessionId && message.state === 'sent')
      return true
  }
  return undefined
}

/** Verify identity against stored records before using IDs in storage keys. */
export async function verifiedTurn(
  transaction: ChatTransaction,
  identity: RunnerEventIdentity,
) {
  if (identity.sessionId === null || identity.turnId === null) return null
  const session = (await transaction.sessions()).find(
    (session) => session.id === identity.sessionId,
  )
  if (!session) return null
  const turn =
    session.activeTurnId === identity.turnId
      ? await transaction.turn(session.activeTurnId)
      : (await transaction.turns()).find((turn) => turn.id === identity.turnId)
  if (!turn || turn.id !== identity.turnId || turn.sessionId !== session.id)
    return null
  return {
    session,
    turn,
    active: session.activeTurnId === turn.id,
    ended:
      turn.state === 'finished' ||
      turn.state === 'stopped' ||
      turn.state === 'failed',
    started: await startedEvidence(transaction, turn),
  }
}
