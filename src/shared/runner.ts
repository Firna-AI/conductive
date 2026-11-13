import type { AgentChoice } from './agents'
import type { Timestamp } from './api'
import type { AgentChatEvent } from './chat-events'
import type { CommitAuthor } from './commit-author'
import type { RunnerFileEvent } from './files'
import type { UserMessage } from './messages'
import type { RunnerPortsUpdated } from './ports'
import type { RunnerFileCommand, RunnerFileResponse } from './runner-files'
import type { WorkspaceStart } from './workspaces'

export const RUNNER_PROTOCOL_VERSION = 2 as const
export type RunnerProtocolVersion = typeof RUNNER_PROTOCOL_VERSION

export function isSupportedRunnerVersion(
  version: unknown,
): version is RunnerProtocolVersion {
  return version === RUNNER_PROTOCOL_VERSION
}

/**
 * Maximum UTF-8 bytes of JSON.stringify(the complete RunnerEventEnvelope).
 * Count its stream ID, number, timestamp, payload, escapes, and delimiters.
 * Add no spaces. Exclude WebSocket framing and the workspace storage wrapper.
 * One MiB leaves room below the storage value limit for that stored wrapper.
 */
export const RUNNER_EVENT_MAX_BYTES = 1_048_576

/**
 * The bearer token authenticates the outbound socket on the machine hostname.
 * Send hello first. Unsupported versions close before welcome or commands.
 * A stream ID and its counter persist with the runner outbox across reconnects.
 * An outbox contains events only. It must never contain turn credentials.
 */
export interface RunnerHello {
  type: 'hello'
  protocolVersion: RunnerProtocolVersion
  workspaceId: string
  streamId: string
  loginKinds?: readonly RunnerLoginKind[]
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
  | RunnerPortsUpdated
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

export type RunnerLoginKind =
  | { agent: 'claude'; kind: 'token' }
  | { agent: 'claude'; kind: 'api-key' }
  | { agent: 'codex'; kind: 'token' }
  | { agent: 'codex'; kind: 'api-key' }

export const RUNNER_SUPPORTED_LOGIN_KINDS: readonly RunnerLoginKind[] = [
  { agent: 'claude', kind: 'token' },
  { agent: 'claude', kind: 'api-key' },
  { agent: 'codex', kind: 'token' },
  { agent: 'codex', kind: 'api-key' },
]

export function runnerSupportsLogin(
  login: RunnerLoginKind,
  advertised?: readonly RunnerLoginKind[],
): boolean {
  return advertised
    ? advertised.some(
        (kind) => kind.agent === login.agent && kind.kind === login.kind,
      )
    : login.agent !== 'codex' || login.kind !== 'token'
}

export type RunnerLogin = RunnerLoginKind & { secret: string }

export interface RunnerCodexAccount {
  accountId: string
  email: string | null
  planType: string | null
  userId: string | null
}

export type RunnerTurnCredential =
  | {
      agent: 'claude'
      kind: 'token' | 'api-key'
      token: string
      promptCacheTtl?: '1h'
    }
  | { agent: 'codex'; kind: 'api-key'; token: string }
  | {
      agent: 'codex'
      kind: 'token'
      token: string
      account: RunnerCodexAccount
    }

export interface RunnerAttachment {
  attachmentId: string
  /** Absolute path in the workspace repository, after the backend copies the file. */
  path: string
}

export interface RunnerBranches {
  workspaceBranch: string
  targetBranch: string
}

export interface RunnerTurn {
  type: 'turn'
  commandId: string
  sessionId: string
  turnId: string
  message: UserMessage
  /** Current Worker branches. Older command producers can omit them. */
  branches?: RunnerBranches
  attachments: readonly RunnerAttachment[]
  credential: RunnerTurnCredential
  commitAuthor: CommitAuthor | null
}

export interface RunnerMessageDuringTurn {
  type: 'message'
  commandId: string
  sessionId: string
  turnId: string
  message: UserMessage
  branches?: RunnerBranches
  attachments: readonly RunnerAttachment[]
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
  | 'files.snapshot'
  | 'changes.updated'
  | 'start.updated'
  | 'workspace.title'
  | 'ports.updated'

/** Request a complete current report. Transport redelivery keeps the command ID. */
export interface RunnerReportRefresh {
  type: 'report.refresh'
  commandId: string
  kind: RunnerReportKind
}

type RunnerControlCommand =
  RunnerInterrupt | RunnerChangeModel | RunnerFileCommand | RunnerReportRefresh

export type RunnerCommand =
  RunnerTurn | RunnerMessageDuringTurn | RunnerControlCommand

export type WorkspaceToRunner =
  RunnerWelcome | RunnerConfirm | RunnerResend | RunnerCommand
