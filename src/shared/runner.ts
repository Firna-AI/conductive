import type { AgentChoice } from './agents'
import type { Timestamp } from './api'
import type { AgentChatEvent } from './chat-events'
import type { RunnerFileEvent } from './files'
import type { UserMessage } from './messages'
import type { RunnerFileCommand, RunnerFileResponse } from './runner-files'
import type { WorkspaceStart } from './workspaces'

export const RUNNER_PROTOCOL_VERSION = 2 as const
export type RunnerProtocolVersion = 1 | 2

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
interface RunnerWelcome<
  Version extends RunnerProtocolVersion = RunnerProtocolVersion,
> {
  type: 'welcome'
  protocolVersion: Version
  streamId: string
  confirmedThrough: number
}
interface RunnerResend {
  type: 'resend'
  streamId: string
  fromEventNumber: number
}

/** This type is server-only. The runner keeps the login in memory for this turn. */
export type RunnerLoginKind =
  | { agent: 'claude'; kind: 'token' }
  | { agent: 'claude'; kind: 'api-key' }
  | { agent: 'codex'; kind: 'token' }
  | { agent: 'codex'; kind: 'api-key' }

type RunnerLoginRules = {
  [Login in RunnerLoginKind as `${Login['agent']}:${Login['kind']}`]: {
    login: Login
    versions: Record<RunnerProtocolVersion, boolean | 'advertised'>
  }
}

const RUNNER_LOGIN_SUPPORT = {
  'claude:token': {
    login: { agent: 'claude', kind: 'token' },
    versions: { 1: true, 2: true },
  },
  'claude:api-key': {
    login: { agent: 'claude', kind: 'api-key' },
    versions: { 1: true, 2: true },
  },
  'codex:token': {
    login: { agent: 'codex', kind: 'token' },
    versions: { 1: false, 2: 'advertised' },
  },
  'codex:api-key': {
    login: { agent: 'codex', kind: 'api-key' },
    versions: { 1: true, 2: true },
  },
} as const satisfies RunnerLoginRules

export const RUNNER_SUPPORTED_LOGIN_KINDS: readonly RunnerLoginKind[] =
  Object.values(RUNNER_LOGIN_SUPPORT).flatMap((rule) =>
    rule.versions[RUNNER_PROTOCOL_VERSION] ? [rule.login] : [],
  )

export function runnerSupportsLogin(
  protocolVersion: RunnerProtocolVersion,
  login: RunnerLoginKind,
  advertised?: readonly RunnerLoginKind[],
): boolean {
  const support = Object.values(RUNNER_LOGIN_SUPPORT).find(
    (rule) =>
      rule.login.agent === login.agent && rule.login.kind === login.kind,
  )?.versions[protocolVersion]
  if (support === false || support === undefined) return false
  if (protocolVersion === 2 && advertised !== undefined)
    return advertised.some(
      (kind) => kind.agent === login.agent && kind.kind === login.kind,
    )
  return support === true
}

type RunnerLoginRule =
  (typeof RUNNER_LOGIN_SUPPORT)[keyof typeof RUNNER_LOGIN_SUPPORT]
export type RunnerLoginV1 = Extract<
  RunnerLoginRule,
  { versions: { 1: true } }
>['login'] & { secret: string }

export function isRunnerV1Login(login: RunnerLogin): login is RunnerLoginV1 {
  return runnerSupportsLogin(1, login)
}

export type RunnerLogin = RunnerLoginKind & { secret: string }

export interface RunnerCodexAccount {
  accountId: string
  email: string | null
  planType: string | null
  userId: string | null
}

export type RunnerTurnCredential =
  | { agent: 'claude'; kind: 'token' | 'api-key'; token: string }
  | { agent: 'codex'; kind: 'api-key'; token: string }
  | {
      agent: 'codex'
      kind: 'token'
      token: string
      account: RunnerCodexAccount
    }

export interface RunnerAttachment {
  attachmentId: string
  /** The backend puts the attachment here before it sends the message. */
  path: string
}

interface RunnerTurnV1 {
  type: 'turn'
  commandId: string
  sessionId: string
  turnId: string
  message: UserMessage
  attachments: readonly RunnerAttachment[]
  /** The session starter owns this login, whoever sent the message. */
  login: RunnerLoginV1
  credential?: never
}

interface RunnerMessageDuringTurnV1 {
  type: 'message'
  commandId: string
  sessionId: string
  turnId: string
  message: UserMessage
  attachments: readonly RunnerAttachment[]
  login: RunnerLoginV1
  credential?: never
}

export interface RunnerTurnV2 extends Omit<
  RunnerTurnV1,
  'login' | 'credential'
> {
  login?: never
  credential: RunnerTurnCredential
}

export interface RunnerMessageDuringTurnV2 extends Omit<
  RunnerMessageDuringTurnV1,
  'login'
> {
  login?: never
  credential?: never
}
export type RunnerTurn = RunnerTurnV1 | RunnerTurnV2
export type RunnerMessageDuringTurn =
  RunnerMessageDuringTurnV1 | RunnerMessageDuringTurnV2

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

type RunnerControlCommand =
  RunnerInterrupt | RunnerChangeModel | RunnerFileCommand | RunnerReportRefresh

export type RunnerCommandV1 =
  RunnerTurnV1 | RunnerMessageDuringTurnV1 | RunnerControlCommand
export type RunnerCommandV2 =
  RunnerTurnV2 | RunnerMessageDuringTurnV2 | RunnerControlCommand
export type RunnerCommand = RunnerCommandV1 | RunnerCommandV2

export type WorkspaceToRunnerV1 =
  RunnerWelcome<1> | RunnerConfirm | RunnerResend | RunnerCommandV1
export type WorkspaceToRunnerV2 =
  RunnerWelcome<2> | RunnerConfirm | RunnerResend | RunnerCommandV2
export type WorkspaceToRunner = WorkspaceToRunnerV1 | WorkspaceToRunnerV2
