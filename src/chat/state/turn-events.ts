import type { AgentChatEvent } from '../../shared/chat-events'
import type { RunningTurn, Transcript, TranscriptItem } from './transcript'

export const userKey = (messageId: string) => `user:${messageId}`

export function replaceAt<T>(items: readonly T[], index: number, item: T): T[] {
  return items.map((current, position) => (position === index ? item : current))
}

export function markSent(
  items: readonly TranscriptItem[],
  ids: readonly string[],
) {
  return items.map((item) =>
    item.kind === 'user' && ids.includes(item.message.id)
      ? { ...item, message: { ...item.message, state: 'sent' as const } }
      : item,
  )
}

/** A turn that ends leaves no call running. */
function settleTools(
  items: readonly TranscriptItem[],
  turnId: string,
  state: 'done' | 'stopped',
): TranscriptItem[] {
  return items.map((item) =>
    item.kind === 'tool' &&
    item.turnId === turnId &&
    item.tool.state === 'running'
      ? { ...item, tool: { ...item.tool, state } }
      : item,
  )
}

/**
 * Places an answer after the last message that it answers, so a result
 * shows with every message that it answers, also one sent during the turn.
 */
function placeAnswer(
  items: TranscriptItem[],
  id: string,
  answers: readonly string[],
): TranscriptItem[] {
  const from = items.findIndex((item) => item.id === id)
  const last = Math.max(
    ...answers.map((answer) =>
      items.findIndex((item) => item.id === userKey(answer)),
    ),
  )
  if (from < 0 || last <= from) return items
  const answer = items[from]
  const moved = items.filter((_, index) => index !== from)
  moved.splice(last, 0, answer)
  return moved
}

/** The running turn after a turn ends: none, unless another turn runs. */
function ending(transcript: Transcript, turnId: string): RunningTurn | null {
  return transcript.turn && transcript.turn.turnId !== turnId
    ? transcript.turn
    : null
}

function writeAgent(
  items: readonly TranscriptItem[],
  event: Extract<
    AgentChatEvent,
    { type: 'assistant.delta' | 'assistant.completed' }
  >,
): TranscriptItem[] {
  const id = `agent:${event.turnId}:${event.messageId}`
  const index = items.findIndex((item) => item.id === id)
  const current = items[index]
  const previous = current?.kind === 'agent' ? current.text : ''
  const text =
    event.type === 'assistant.delta' ? previous + event.text : event.text
  const item: TranscriptItem = { kind: 'agent', id, turnId: event.turnId, text }
  const written = index < 0 ? [...items, item] : replaceAt(items, index, item)
  return event.type === 'assistant.completed'
    ? placeAnswer(written, id, event.userMessageIds)
    : written
}

/**
 * Applies one event of an agent turn: its start, thinking, text, tool calls,
 * and its end as finished, stopped, or failed.
 */
export function foldTurn(
  transcript: Transcript,
  event: AgentChatEvent,
  occurredAt: number,
): Transcript {
  const { items } = transcript
  const turn: RunningTurn =
    transcript.turn?.turnId === event.turnId
      ? transcript.turn
      : {
          turnId: event.turnId,
          startedAt: occurredAt,
          choice: null,
          thinking: false,
        }
  const working = { ...turn, thinking: false }
  switch (event.type) {
    case 'turn.started':
      return {
        items: markSent(items, event.messageIds),
        turn: { ...working, startedAt: event.startedAt, choice: event.choice },
      }
    case 'turn.thinking':
      return { items, turn: { ...turn, thinking: true } }
    case 'assistant.delta':
    case 'assistant.completed':
      return { items: writeAgent(items, event), turn: working }
    case 'tool.updated': {
      const id = `tool:${event.turnId}:${event.tool.id}`
      const index = items.findIndex((item) => item.id === id)
      const item: TranscriptItem = {
        kind: 'tool',
        id,
        turnId: event.turnId,
        tool: event.tool,
      }
      return {
        items: index < 0 ? [...items, item] : replaceAt(items, index, item),
        turn: working,
      }
    }
    case 'turn.completed': {
      const stopped = event.state === 'stopped'
      const ended = settleTools(
        markSent(items, event.userMessageIds),
        event.turnId,
        stopped ? 'stopped' : 'done',
      )
      const end: TranscriptItem = stopped
        ? {
            kind: 'stopped',
            id: `stopped:${event.turnId}`,
            turnId: event.turnId,
          }
        : {
            kind: 'turn-end',
            id: `end:${event.turnId}`,
            turnId: event.turnId,
            durationMs: event.durationMs,
            files: event.files,
          }
      return {
        items: [...ended.filter((item) => item.id !== end.id), end],
        turn: ending(transcript, event.turnId),
      }
    }
    case 'turn.failed': {
      const failed: TranscriptItem = {
        kind: 'failed',
        id: `failed:${event.turnId}`,
        turnId: event.turnId,
        error: event.error,
        retryMessageId: event.retryMessageId,
      }
      const ended = settleTools(items, event.turnId, 'stopped')
      return {
        items: [...ended.filter((item) => item.id !== failed.id), failed],
        turn: ending(transcript, event.turnId),
      }
    }
  }
}
