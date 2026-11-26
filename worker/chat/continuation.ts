import type { ChatTransaction } from './store'
import type { StoredTurn } from './types'

/** Move unanswered messages to a new turn before ending the previous one. */
export async function continueUnanswered(
  transaction: ChatTransaction,
  previous: StoredTurn,
  randomId: () => string,
  messages: 'unanswered' | 'queued' = 'unanswered',
): Promise<StoredTurn | undefined> {
  let next: StoredTurn | undefined
  for (const command of await transaction.pending()) {
    if (
      (command.type !== 'turn' && command.type !== 'message') ||
      command.turnId !== previous.id
    )
      continue
    const message = await transaction.message(command.messageId)
    if (!message || (messages === 'queued' && message.state !== 'queued'))
      continue
    if (!next) {
      next = {
        id: randomId(),
        sessionId: previous.sessionId,
        senderId: message.sender.id,
        messageIds: [],
        state: 'queued',
        closeAfterStop: false,
        stopRequest: null,
      }
    }
    const type = next.messageIds.length === 0 ? 'turn' : 'message'
    next.messageIds.push(message.id)
    await transaction.saveMessageTurn(message.id, next.id)
    await transaction.saveCommand({
      ...command,
      commandId: randomId(),
      type,
      turnId: next.id,
    })
  }
  if (!next) return
  next.nextTurnId = previous.nextTurnId ?? null
  await transaction.saveTurn(next)
  if ((await transaction.newestTurn(previous.sessionId)) === previous.id)
    await transaction.saveNewestTurn(previous.sessionId, next.id)
  previous.nextTurnId = next.id
  return next
}
