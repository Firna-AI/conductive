import type { AgentChatEvent } from '../generated/AgentChatEvent'
import { agentKey, endKey, failedKey, stoppedKey, toolKey } from './item-keys'
import type { TranscriptBatch } from './transcript-batch'
import type { TranscriptItem } from './transcript'

type AgentText = Extract<
  AgentChatEvent,
  { type: 'assistant.delta' | 'assistant.completed' }
>

/** The member or session of the first Stop request in a turn. */
export function stopperOf(
  fold: TranscriptBatch,
  turnId: string,
): Pick<Extract<TranscriptItem, { kind: 'stopped' }>, 'by' | 'from'> {
  const source = Object.hasOwn(fold.stopRequests, turnId)
    ? fold.stopRequests[turnId]
    : undefined
  return typeof source === 'string'
    ? { by: source }
    : { by: null, ...(source !== undefined && { from: source }) }
}

/** Ends the shown work without changing another running turn. */
export function endLostTurn(fold: TranscriptBatch, turnId: string): void {
  fold.items.settle(turnId, 'stopped')
  if (fold.turn?.turnId === turnId) fold.turn = null
  delete fold.stopRequests[turnId]
}

/** A delta extends text. Completion and its mark survive later deltas. */
export function agentItem(
  fold: TranscriptBatch,
  event: AgentText,
): Extract<TranscriptItem, { kind: 'agent' }> {
  const id = agentKey(event.turnId, event.messageId)
  const current = fold.items.get(id)
  const previous = current?.kind === 'agent' ? current.text : ''
  const text =
    event.type === 'assistant.delta' ? previous + event.text : event.text
  const item = { kind: 'agent' as const, id, turnId: event.turnId, text }
  return event.type === 'assistant.completed' ||
    (current?.kind === 'agent' && current.complete === true)
    ? { ...item, complete: true }
    : item
}

/** Applies accepted work of a turn that has not ended. */
export function foldTurn(
  fold: TranscriptBatch,
  event: AgentChatEvent,
  occurredAt: number,
): void {
  const turn =
    fold.turn?.turnId === event.turnId
      ? fold.turn
      : {
          turnId: event.turnId,
          startedAt: occurredAt,
          choice: null,
          thinking: false,
        }
  const working = { ...turn, thinking: false }
  switch (event.type) {
    case 'turn.started':
      fold.items.markSent(event.messageIds)
      fold.turn = {
        ...working,
        startedAt: event.startedAt,
        choice: event.choice,
      }
      return
    case 'turn.thinking':
      fold.turn = { ...turn, thinking: true }
      return
    case 'assistant.delta':
    case 'assistant.completed': {
      const item = agentItem(fold, event)
      fold.place(item, false)
      if (event.type === 'assistant.completed') {
        fold.items.answer(item.id, event.userMessageIds)
      }
      fold.turn = working
      return
    }
    case 'tool.updated':
      fold.place(
        {
          kind: 'tool',
          id: toolKey(event.turnId, event.tool.id),
          turnId: event.turnId,
          tool: event.tool,
        },
        false,
      )
      fold.turn = working
      return
    case 'turn.completed': {
      const stopped = event.state === 'stopped'
      fold.items.markSent(event.userMessageIds)
      fold.items.settle(event.turnId, stopped ? 'stopped' : 'done')
      fold.place(
        stopped
          ? {
              kind: 'stopped',
              id: stoppedKey(event.turnId),
              turnId: event.turnId,
              ...stopperOf(fold, event.turnId),
            }
          : {
              kind: 'turn-end',
              id: endKey(event.turnId),
              turnId: event.turnId,
              durationMs: event.durationMs,
              files: event.files,
            },
        false,
      )
      if (fold.turn?.turnId === event.turnId) fold.turn = null
      delete fold.stopRequests[event.turnId]
      fold.completion(event)
      return
    }
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
        false,
      )
      if (fold.turn?.turnId === event.turnId) fold.turn = null
      delete fold.stopRequests[event.turnId]
  }
}
