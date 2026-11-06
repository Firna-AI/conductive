import type { AgentChoice } from './agents'
import type { Timestamp } from './api'
import type { ChangedFile } from './files'
import type { UserMessage } from './messages'
import type { Session } from './sessions'

export interface TurnEventContext {
  sessionId: string
  turnId: string
}

export interface ToolCall {
  id: string
  kind: 'read' | 'search' | 'create' | 'edit' | 'run' | 'computer' | 'other'
  target: string
  detail: string | null
  state: 'running' | 'done' | 'stopped' | 'failed'
}

/** Provider-neutral events. SDK messages and credentials never enter this union. */
export type AgentChatEvent = TurnEventContext &
  (
    | {
        type: 'turn.started'
        senderId: string
        choice: AgentChoice
        startedAt: Timestamp
        messageIds: readonly string[]
      }
    | { type: 'turn.thinking' }
    | { type: 'assistant.delta'; messageId: string; text: string }
    | {
        type: 'assistant.completed'
        messageId: string
        text: string
        /** One answer can respond to several user messages. */
        userMessageIds: readonly string[]
      }
    | { type: 'tool.updated'; tool: ToolCall }
    | {
        type: 'turn.completed'
        state: 'finished' | 'stopped'
        durationMs: number
        files: readonly ChangedFile[]
        userMessageIds: readonly string[]
      }
    | {
        type: 'turn.failed'
        error: { code: string; message: string }
        retryMessageId: string
        durationMs: number
      }
  )

export type ChatEvent =
  | AgentChatEvent
  | { type: 'message.accepted'; message: UserMessage }
  | {
      type: 'message.sent'
      sessionId: string
      messageId: string
      turnId: string
    }
  | { type: 'session.updated'; session: Session }
