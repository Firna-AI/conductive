import type { QueueScope } from '../merge-queue/contracts'
import type { QueueFixEnd } from '../merge-queue/fix-contracts'
import { chatKey } from './storage-keys'
import type { ChatData, StoredTurn } from './types'

export const QUEUE_FIX_REPORT = 'merge-queue-report'
export const QUEUE_FIX_REPORT_ALARM = `alarm:${QUEUE_FIX_REPORT}`
export const QUEUE_FIX_OUTBOX = chatKey('queue-fix-report', '')

export interface ReadyQueueFix extends QueueFixEnd {
  scope: QueueScope
}

export class QueueFixRecords {
  private readonly data: ChatData

  constructor(data: ChatData) {
    this.data = data
  }

  receipt(messageId: string): Promise<QueueScope | undefined> {
    return this.data.get(chatKey('queue-fix-receipt', messageId))
  }

  saveReceipt(messageId: string, scope: QueueScope): Promise<void> {
    return this.data.put(chatKey('queue-fix-receipt', messageId), scope)
  }

  async end(
    turn: StoredTurn,
    state: QueueFixEnd['state'],
    endedAt: number,
    now: number,
  ): Promise<void> {
    const messageId = turn.messageIds[0]
    if (!messageId) return
    const scope = await this.receipt(messageId)
    if (!scope) return
    // A runner restart can move an unanswered message to the next turn.
    if ((await this.data.get(chatKey('message-turn', messageId))) !== turn.id)
      return
    await this.data.put<ReadyQueueFix>(chatKey('queue-fix-report', messageId), {
      scope,
      messageId,
      turnId: turn.id,
      state,
      endedAt,
    })
    await this.data.put(QUEUE_FIX_REPORT_ALARM, now)
  }
}
