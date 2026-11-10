import type { ChatTransaction } from './store'
import { TurnLifecycle } from './turn-lifecycle'

export async function stopDispatchedTurns(
  transaction: ChatTransaction,
): Promise<void> {
  for (const session of await transaction.sessions()) {
    if (!session.activeTurnId) continue
    const turn = await transaction.turn(session.activeTurnId)
    if (!turn || (turn.state !== 'running' && turn.state !== 'stopping'))
      continue
    await new TurnLifecycle(transaction, session).workspaceStopped(turn)
  }
}
