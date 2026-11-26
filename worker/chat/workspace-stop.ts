import type { ChatTransaction } from './store'
import { TurnCompletion } from './turn-completion'

export async function stopDispatchedTurns(
  transaction: ChatTransaction,
  keepQueued?: () => string,
): Promise<void> {
  for (const session of await transaction.sessions()) {
    if (!session.activeTurnId) continue
    const turn = await transaction.turn(session.activeTurnId)
    if (!turn || (turn.state !== 'running' && turn.state !== 'stopping'))
      continue
    await new TurnCompletion(transaction, session).stopped(turn, keepQueued)
  }
}
