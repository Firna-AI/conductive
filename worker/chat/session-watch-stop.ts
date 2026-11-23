import type { ChatTransaction } from './store'

/** Stop cancels pending wake dispatch while its recorded notice stays in history. */
export async function invalidateSessionWatches(
  transaction: ChatTransaction,
  sessionId: string,
  nonce: string,
): Promise<void> {
  await transaction.watches.invalidate(sessionId, nonce)
  for (const command of await transaction.pending()) {
    if (
      command.sessionId === sessionId &&
      'sessionWatchId' in command &&
      command.sessionWatchId !== undefined
    ) {
      await transaction.removeCommand(command.commandId)
      const receipt = await transaction.watches.receipt(command.sessionWatchId)
      if (receipt?.state === 'accepted')
        await transaction.watches.saveReceipt({
          ...receipt,
          resume: 'cancelled',
        })
    }
  }
}
