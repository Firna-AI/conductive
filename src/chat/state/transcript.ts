import type { AgentChoice } from '../../shared/agents'
import type { ChatEvent, ToolCall } from '../../shared/chat-events'
import type { ChangedFile } from '../../shared/files'
import type { UserMessage } from '../../shared/messages'
import { foldTurn, markSent, replaceAt, userKey } from './turn-events'

/** One part of a chat transcript, in the order that the chat shows it. */
export type TranscriptItem =
  | { kind: 'user'; id: string; message: UserMessage }
  | { kind: 'agent'; id: string; turnId: string; text: string }
  | { kind: 'tool'; id: string; turnId: string; tool: ToolCall }
  | {
      kind: 'turn-end'
      id: string
      turnId: string
      durationMs: number
      files: readonly ChangedFile[]
    }
  | { kind: 'stopped'; id: string; turnId: string }
  | {
      kind: 'failed'
      id: string
      turnId: string
      error: { code: string; message: string }
      retryMessageId: string
    }

export interface RunningTurn {
  turnId: string
  startedAt: number
  choice: AgentChoice | null
  /** The agent thinks and has written nothing since its last step. */
  thinking: boolean
}

export interface Transcript {
  items: readonly TranscriptItem[]
  turn: RunningTurn | null
}

export const emptyTranscript: Transcript = { items: [], turn: null }

/**
 * Applies one chat event of a session to its transcript. The chat shows only
 * the messages that people sent. A message ID that no accepted message has,
 * such as one that the agent SDK added, shows nothing.
 */
export function foldEvent(
  transcript: Transcript,
  event: ChatEvent,
  occurredAt: number,
): Transcript {
  switch (event.type) {
    case 'session.updated':
      return transcript
    case 'message.accepted': {
      const item: TranscriptItem = {
        kind: 'user',
        id: userKey(event.message.id),
        message: event.message,
      }
      const index = transcript.items.findIndex((entry) => entry.id === item.id)
      const items =
        index < 0
          ? [...transcript.items, item]
          : replaceAt(transcript.items, index, item)
      return { ...transcript, items }
    }
    case 'message.sent':
      return {
        ...transcript,
        items: markSent(transcript.items, [event.messageId]),
      }
    default:
      return foldTurn(transcript, event, occurredAt)
  }
}
