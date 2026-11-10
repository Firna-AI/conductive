import type { AgentChatEvent } from '../../src/shared/chat-events'
import { HttpError } from '../http'
import { markSent } from './messages'
import { readRunnerEventIdentity } from './runner-event-identity'
import { sameAgent } from './sessions'
import type { ChatTransaction } from './store'
import { verifiedTurn } from './turn-context'
import { TurnLifecycle } from './turn-lifecycle'

/** Validate every acknowledgement before any message or command changes. */
export async function prepareAgentEvent(
  transaction: ChatTransaction,
  event: AgentChatEvent,
  occurredAt: number,
  randomId: () => string,
): Promise<() => Promise<void>> {
  const target = await verifiedTurn(transaction, readRunnerEventIdentity(event))
  if (
    !target ||
    target.started === false ||
    (!target.ended && (!target.active || target.started !== true))
  ) {
    throw new HttpError(
      400,
      'runner_turn_mismatch',
      'The turn is not available.',
    )
  }
  const { session, turn } = target
  let acknowledged: readonly string[] = []
  if (event.type === 'turn.started') {
    sameAgent(session, event.choice)
    if (event.senderId !== turn.senderId) {
      throw new HttpError(
        400,
        'runner_sender_mismatch',
        'The sender does not match this turn.',
      )
    }
    acknowledged = event.messageIds
  } else if (
    event.type === 'assistant.completed' ||
    event.type === 'turn.completed'
  ) {
    acknowledged = event.userMessageIds
  } else if (event.type === 'turn.failed') {
    if (!turn.messageIds.includes(event.retryMessageId)) {
      throw new HttpError(
        400,
        'runner_message_mismatch',
        'The message is not available.',
      )
    }
  }
  for (const messageId of acknowledged) {
    const message = turn.messageIds.includes(messageId)
      ? await transaction.message(messageId)
      : undefined
    if (!message || message.sessionId !== turn.sessionId) {
      throw new HttpError(
        400,
        'runner_message_mismatch',
        'The message is not available.',
      )
    }
  }
  return async () => {
    if (target.ended) {
      if (
        turn.state === 'failed' &&
        turn.started === true &&
        (event.type === 'turn.completed' || event.type === 'turn.failed')
      )
        for (const command of await transaction.pending()) {
          if (
            command.type === 'interrupt' &&
            command.sessionId === session.id &&
            command.turnId === turn.id
          )
            await transaction.removeCommand(command.commandId)
        }
      await transaction.emit(event, occurredAt, true)
      return
    }
    turn.started = true
    if (event.type === 'turn.started') turn.startedAt = event.startedAt
    if (event.type === 'turn.started' && turn.state !== 'stopping')
      turn.state = 'running'
    for (const messageId of acknowledged)
      await markSent(transaction, turn, messageId)
    for (const command of await transaction.pending()) {
      if (
        (command.type === 'turn' || command.type === 'message') &&
        command.turnId === turn.id &&
        acknowledged.includes(command.messageId)
      ) {
        await transaction.removeCommand(command.commandId)
      }
    }
    if (event.type === 'turn.completed' || event.type === 'turn.failed') {
      await new TurnLifecycle(transaction, session).runnerEnded(
        turn,
        event,
        occurredAt,
        randomId,
      )
    } else {
      await transaction.emit(event, occurredAt)
      await transaction.saveTurn(turn)
    }
  }
}
