import type { AgentChatEvent } from '../generated/AgentChatEvent'
import { endKey, failedKey, stoppedKey, toolKey } from './item-keys'
import type { TranscriptBatch } from './transcript-batch'
import { agentItem, stopperOf } from './turn-events'

/** A late end keeps an existing end row and puts its files before that row. */
function foldLateEnd(
  fold: TranscriptBatch,
  event: Extract<AgentChatEvent, { type: 'turn.completed' }>,
): void {
  const { turnId } = event
  fold.items.markSent(event.userMessageIds)
  fold.items.settle(turnId, 'stopped')
  if (event.state === 'stopped' && !fold.items.hasEnd(turnId)) {
    fold.place(
      {
        kind: 'stopped',
        id: stoppedKey(turnId),
        turnId,
        ...stopperOf(fold, turnId),
      },
      true,
    )
  }
  if (event.state === 'finished' || event.files.length > 0) {
    fold.place(
      {
        kind: 'turn-end',
        id: endKey(turnId),
        turnId,
        durationMs: event.durationMs,
        files: event.files,
      },
      true,
    )
  }
  fold.completion(event)
  delete fold.stopRequests[turnId]
}

/** Late work stays inside its ended turn and changes no running turn. */
export function foldLate(fold: TranscriptBatch, event: AgentChatEvent): void {
  switch (event.type) {
    case 'turn.started':
      fold.items.markSent(event.messageIds)
      return
    case 'turn.thinking':
      return
    case 'assistant.delta':
    case 'assistant.completed':
      fold.place(agentItem(fold, event), true)
      return
    case 'tool.updated': {
      const { tool } = event
      const state = tool.state === 'running' ? 'stopped' : tool.state
      fold.place(
        {
          kind: 'tool',
          id: toolKey(event.turnId, tool.id),
          turnId: event.turnId,
          tool: { ...tool, state },
        },
        true,
      )
      return
    }
    case 'turn.completed':
      foldLateEnd(fold, event)
      return
    case 'turn.failed':
      fold.items.settle(event.turnId, 'stopped')
      fold.place(
        {
          kind: 'failed',
          id: failedKey(event.turnId),
          turnId: event.turnId,
          error: event.error,
          retryMessageId: event.retryMessageId,
        },
        true,
      )
  }
}
