import type { AgentChoice } from './agents'
import type { Timestamp } from './api'
import type { AgentChatEvent } from './chat-events'
import type { FileEvent } from './files'
import type { UserMessage } from './messages'
import type { RunnerFileCommand, RunnerFileResponse } from './runner-files'
import type { WorkspaceStart } from './workspaces'

export const RUNNER_PROTOCOL_VERSION = 1 as const
export type RunnerProtocolVersion = typeof RUNNER_PROTOCOL_VERSION

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

export type RunnerEvent =
  | AgentChatEvent
  | FileEvent
  | { type: 'runner.ready' }
  | { type: 'start.updated'; start: WorkspaceStart }
  | { type: 'workspace.title'; name: string }

export type RunnerToWorkspace =
  RunnerHello | RunnerEventEnvelope | RunnerFileResponse

/** A confirm covers only events that the workspace has stored contiguously. */
export interface RunnerConfirm {
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
 */
export interface RunnerWelcome {
  type: 'welcome'
  protocolVersion: RunnerProtocolVersion
  streamId: string
  confirmedThrough: number
}
export interface RunnerResend {
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
  /** The sender owns this login. The workspace owner does not supply it. */
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

export type RunnerCommand =
  | RunnerTurn
  | RunnerMessageDuringTurn
  | RunnerInterrupt
  | RunnerChangeModel
  | RunnerFileCommand

export type WorkspaceToRunner =
  RunnerWelcome | RunnerConfirm | RunnerResend | RunnerCommand
