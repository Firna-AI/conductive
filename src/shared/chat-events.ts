import type { AgentChoice } from './agents'
import type { Timestamp } from './api'
import type { ChangedFile } from './files'
import type { MessageSender, UserMessage } from './messages'
import type { RunnerEvent } from './runner'
import type { Session } from './sessions'

/**
 * Maximum UTF-8 bytes of JSON.stringify(non-null detail), including quotes
 * and JSON escapes. A 64 KiB excerpt keeps tool output below the event budget.
 */
export const TOOL_DETAIL_MAX_BYTES = 65_536

/** Bound the chat summary work. The Changes tab keeps the complete file list. */
export const TURN_COMPLETED_MAX_FILES = 200

/**
 * Maximum UTF-8 bytes of JSON.stringify(turn.completed.files), including
 * brackets, commas, and escapes. This bounds lists with very long file paths.
 */
export const TURN_COMPLETED_FILES_MAX_BYTES = 262_144

export interface TurnEventContext {
  sessionId: string
  turnId: string
}

export interface ToolCall {
  id: string
  kind: 'read' | 'search' | 'create' | 'edit' | 'run' | 'computer' | 'other'
  target: string
  /**
   * Keep the longest source prefix that fits TOOL_DETAIL_MAX_BYTES.
   * Replace lone UTF-16 surrogates with U+FFFD before counting or truncating.
   * Never split a Unicode code point. JSON escaping counts toward the cap.
   * Null means no detail. Do not insert an omission notice into this text.
   */
  detail: string | null
  /**
   * UTF-8 bytes of the omitted normalized suffix, before JSON escaping.
   * This non-negative safe integer is zero for null or complete detail.
   * Each tool update counts its full source detail, not previous updates.
   */
  omittedDetailBytes: number
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
        /**
         * Keep a prefix of the full unique-path list. Entries stay whole.
         * Apply both TURN_COMPLETED_MAX_FILES and TURN_COMPLETED_FILES_MAX_BYTES.
         */
        files: readonly ChangedFile[]
        /** Unknown changed files. When present, files is empty and omittedFileCount is zero. */
        filesUnavailable?: true
        /** Full list length minus files.length. A non-negative safe integer. */
        omittedFileCount: number
        userMessageIds: readonly string[]
      }
    | {
        type: 'turn.failed'
        error: { code: string; message: string }
        retryMessageId: string
        durationMs: number
      }
  )

export type RunnerEventRefusalReason =
  'too_large' | 'invalid' | 'turn_not_active'

/**
 * The workspace stores this event instead of a refused runner event.
 * Its identity prevents a resend from making a second marker.
 * Keep a recognized discriminator, or use unknown for an invalid discriminator.
 * Include only verified turn context. A workspace-level refusal uses nulls.
 * Session refusals name lost data in chat. Workspace report losses request repair.
 * A failed repair can show a notice beside its data. Never copy raw lost data.
 */
export interface RunnerEventRefused {
  type: 'runner.event-refused'
  streamId: string
  runnerEventNumber: number
  runnerEventType:
    Exclude<RunnerEvent['type'], 'import.preparation'> | 'unknown'
  reason: RunnerEventRefusalReason
  sessionId: string | null
  turnId: string | null
  /** Only the workspace sets this when a requested full replacement is refused. */
  repairFailed?: true
}

export type ChatEvent =
  | AgentChatEvent
  | {
      type: 'workspace.continued'
      sessionId: string
      member: MessageSender
      branch: string
      baseBranch: string
    }
  | RunnerEventRefused
  | { type: 'message.accepted'; message: UserMessage }
  | {
      type: 'message.sent'
      sessionId: string
      messageId: string
      turnId: string
    }
  | { type: 'session.updated'; session: Session }
  | {
      /** The workspace records it when a member presses Stop, never the runner. */
      type: 'turn.stop-requested'
      sessionId: string
      turnId: string
      requestedById: string
    }
