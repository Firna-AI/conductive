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
    if (!turn.loginFailure)
      await transaction.emit({
        type: 'turn.completed',
        sessionId: session.id,
        turnId: turn.id,
        state: 'stopped',
        durationMs: 0,
        files: [],
        omittedFileCount: 0,
        userMessageIds: turn.messageIds,
      })
    await new TurnLifecycle(transaction, session).finish(turn, {
      state: 'stopped',
    })
  }
}
