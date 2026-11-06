import type { AgentChatEvent } from '../../src/shared/chat-events'
import { HttpError } from '../http'
import { continueUnanswered } from './continuation'
import { markSent } from './messages'
import { sameAgent, sessionFor } from './sessions'
import type { ChatTransaction } from './store'

export async function storeAgentEvent(
  transaction: ChatTransaction,
  event: AgentChatEvent,
  occurredAt: number,
  randomId: () => string,
): Promise<void> {
  const session = await sessionFor(transaction, event.sessionId)
  const turn = await transaction.turn(event.turnId)
  if (
    !turn ||
    turn.sessionId !== session.id ||
    session.activeTurnId !== turn.id
  ) {
    throw new HttpError(
      400,
      'runner_turn_mismatch',
      'The turn is not available.',
    )
  }
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
    if (turn.state !== 'stopping') turn.state = 'running'
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
  await transaction.emit(event, occurredAt)
  if (event.type === 'turn.completed' || event.type === 'turn.failed') {
    turn.state = event.type === 'turn.failed' ? 'failed' : event.state
    session.activeTurnId = null
    if (turn.closeAfterStop) session.closedAt = transaction.now
    if (
      event.type === 'turn.completed' &&
      event.state === 'finished' &&
      !turn.closeAfterStop
    ) {
      await continueUnanswered(transaction, session, turn, randomId)
    }
    for (const command of await transaction.pending()) {
      if ('turnId' in command && command.turnId === turn.id)
        await transaction.removeCommand(command.commandId)
    }
    await transaction.saveSession(session)
    await transaction.emit({ type: 'session.updated', session })
  }
  await transaction.saveTurn(turn)
}
