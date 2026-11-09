import type { AgentChoice } from './agents'
import type { Timestamp } from './api'
import type { AgentChatEvent } from './chat-events'
import type { RunnerFileEvent } from './files'
import type { UserMessage } from './messages'
import type { RunnerFileCommand, RunnerFileResponse } from './runner-files'
import type { WorkspaceStart } from './workspaces'

export const RUNNER_PROTOCOL_VERSION = 1 as const
type RunnerProtocolVersion = typeof RUNNER_PROTOCOL_VERSION

/**
 * Maximum UTF-8 bytes of JSON.stringify(the complete RunnerEventEnvelope).
 * Count its stream ID, number, timestamp, payload, escapes, and delimiters.
 * Add no spaces. Exclude WebSocket framing and the workspace storage wrapper.
 * One MiB leaves room below the storage value limit for that stored wrapper.
 */
export const RUNNER_EVENT_MAX_BYTES = 1_048_576

/**
 * The bearer token authenticates the outbound socket on the machine hostname.
 * Send hello first. Keep support for each version held by a live image or disk.
 * A stream ID and its counter persist with the runner outbox across reconnects.
 * An outbox contains events only. It must never contain turn credentials.
 */
export interface RunnerHello {
  type: 'hello'
  protocolVersion: RunnerProtocolVersion
  workspaceId: string
  streamId: string
}

/** Each stream numbers events from 1. Retries keep the same number and payload. */
export interface RunnerEventEnvelope {
  type: 'event'
  streamId: string
  eventNumber: number
  occurredAt: Timestamp
  event: RunnerEvent
}

/**
 * Workspace refusal markers never enter this union or the runner outbox.
 * A failed tree scan sends files.unavailable before runner.ready.
 */
export type RunnerEvent =
  | AgentChatEvent
  | RunnerFileEvent
  | { type: 'runner.ready' }
  | { type: 'start.updated'; start: WorkspaceStart }
  | { type: 'workspace.title'; name: string }

export type RunnerToWorkspace =
  RunnerHello | RunnerEventEnvelope | RunnerFileResponse

/**
 * A confirm covers contiguous stored events or their stored refusal markers.
 * The runner removes either result from its outbox and never retries it.
 * A confirmed file part includes durable assembly state across reconnects.
 */
interface RunnerConfirm {
  type: 'confirm'
  streamId: string
  throughEventNumber: number
}

/**
 * On welcome, discard confirmed outbox entries and resend every later entry.
 * On resend, send every retained entry from fromEventNumber, in number order.
 * A duplicate is confirmed again but is neither stored nor broadcast again.
 * A gap requests resend. It never advances the stored cursor.
 * The workspace gives browser events its own numbers across runner streams.
 * Refusal reasons are too_large, invalid, and turn_not_active. A refusal
 * stores one workspace-only marker before confirming and advancing the cursor.
 * A refused turn.completed or turn.failed still ends its active turn.
 * A storage or network failure is not a refusal. Close without confirming.
 */
interface RunnerWelcome {
  type: 'welcome'
  protocolVersion: RunnerProtocolVersion
  streamId: string
  confirmedThrough: number
}
interface RunnerResend {
  type: 'resend'
  streamId: string
  fromEventNumber: number
}

/** This type is server-only. The runner keeps the login in memory for this turn. */
export type RunnerLogin =
  | { agent: 'claude'; kind: 'token' | 'api-key'; secret: string }
  | { agent: 'codex'; kind: 'api-key'; secret: string }

export interface RunnerAttachment {
  attachmentId: string
  /** The backend puts the attachment here before it sends the message. */
  path: string
}

export interface RunnerTurn {
  type: 'turn'
  commandId: string
  sessionId: string
  turnId: string
  message: UserMessage
  attachments: readonly RunnerAttachment[]
  /** The session starter owns this login, whoever sent the message. */
  login: RunnerLogin
}

export interface RunnerMessageDuringTurn {
  type: 'message'
  commandId: string
  sessionId: string
  turnId: string
  message: UserMessage
  attachments: readonly RunnerAttachment[]
  login: RunnerLogin
}

export interface RunnerInterrupt {
  type: 'interrupt'
  commandId: string
  sessionId: string
  turnId: string
}
export interface RunnerChangeModel {
  type: 'model'
  commandId: string
  sessionId: string
  /** Only the session's current agent. Another agent creates another session. */
  choice: AgentChoice
}

export type RunnerReportKind =
  'files.snapshot' | 'changes.updated' | 'start.updated' | 'workspace.title'

/** Request a complete current report. Transport redelivery keeps the command ID. */
export interface RunnerReportRefresh {
  type: 'report.refresh'
  commandId: string
  kind: RunnerReportKind
}

export type RunnerCommand =
  | RunnerTurn
  | RunnerMessageDuringTurn
  | RunnerInterrupt
  | RunnerChangeModel
  | RunnerFileCommand
  | RunnerReportRefresh

export type WorkspaceToRunner =
  RunnerWelcome | RunnerConfirm | RunnerResend | RunnerCommand
