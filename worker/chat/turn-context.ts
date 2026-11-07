import { isRecord } from '../http'
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

/** Verify raw context against stored records before using IDs in storage keys. */
export async function verifiedTurn(
  transaction: ChatTransaction,
  value: unknown,
) {
  if (
    !isRecord(value) ||
    typeof value.sessionId !== 'string' ||
    typeof value.turnId !== 'string'
  )
    return null
  const session = (await transaction.sessions()).find(
    (session) => session.id === value.sessionId,
  )
  if (!session) return null
  const turn =
    session.activeTurnId === value.turnId
      ? await transaction.turn(session.activeTurnId)
      : (await transaction.turns()).find((turn) => turn.id === value.turnId)
  if (!turn || turn.id !== value.turnId || turn.sessionId !== session.id)
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
