import type { ChatTransaction } from './store'
import { TurnLifecycle } from './turn-lifecycle'
import { TurnCompletion } from './turn-completion'
import { continuationWithinLimit } from './turn-chain'
import {
  eligibleProviderTurn,
  type ProviderStopPermission,
} from './provider-stop-permission'
import { prepareProviderContinuation } from './provider-continuation'

export interface WorkspaceStopOptions {
  providerStop: boolean
}

export async function stopDispatchedTurns(
  transaction: ChatTransaction,
  permissions?: ReadonlyMap<string, ProviderStopPermission>,
  randomId: () => string = crypto.randomUUID,
): Promise<void> {
  for (const session of await transaction.sessions()) {
    if (!session.activeTurnId) continue
    const turn = await transaction.turn(session.activeTurnId)
    if (!turn || (turn.state !== 'running' && turn.state !== 'stopping'))
      continue
    if (!permissions || !eligibleProviderTurn(turn)) {
      await new TurnLifecycle(transaction, session).workspaceStopped(turn)
      continue
    }
    const permission = permissions.get(turn.id) ?? { next: 'message' as const }
    const allowed = await continuationWithinLimit(transaction, turn)
    const next =
      permission.next === 'turn' && allowed
        ? await prepareProviderContinuation(
            transaction,
            session,
            turn,
            permission.sender,
            randomId,
          )
        : undefined
    if (!next)
      turn.providerStop = {
        next:
          allowed && permission.next === 'reconnect' ? 'reconnect' : 'message',
      }
    await new TurnCompletion(transaction, session).stopped(
      turn,
      'cloud_computer_stopped',
    )
    if (turn.started === true)
      await transaction.saveCommand({
        type: 'interrupt',
        commandId: randomId(),
        sessionId: session.id,
        turnId: turn.id,
      })
    if (next) {
      for (const command of next.commands)
        await transaction.saveCommand(command)
      await transaction.providerStopStarts.queue(
        turn.senderId,
        next.turn.id,
        transaction.now,
      )
      await transaction.emit({
        type: 'turn.continued',
        sessionId: session.id,
        previousTurnId: turn.id,
        turnId: next.turn.id,
        next: 'turn',
      })
    } else {
      await transaction.emit({
        type: 'turn.continued',
        sessionId: session.id,
        previousTurnId: turn.id,
        turnId: null,
        next:
          allowed && permission.next === 'reconnect' ? 'reconnect' : 'message',
      })
    }
  }
}
