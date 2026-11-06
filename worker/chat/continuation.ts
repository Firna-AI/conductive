import type { ChatTransaction } from './store'
import type { StoredTurn } from './types'

/** A text-only turn can finish before it answers messages sent during it. */
export async function continueUnanswered(
  transaction: ChatTransaction,
  previous: StoredTurn,
  randomId: () => string,
): Promise<StoredTurn | undefined> {
  let next: StoredTurn | undefined
  for (const command of await transaction.pending()) {
    if (
      (command.type !== 'turn' && command.type !== 'message') ||
      command.turnId !== previous.id
    )
      continue
    const message = await transaction.message(command.messageId)
    if (!message) continue
    if (!next) {
      next = {
        id: randomId(),
        sessionId: previous.sessionId,
        senderId: message.sender.id,
        messageIds: [],
        state: 'queued',
        closeAfterStop: false,
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
  if (next) await transaction.saveTurn(next)
  return next
}
