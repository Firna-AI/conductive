import type { Agent, AgentChoice } from '../../src/shared/agents'
import type { PendingTurn } from '../lifecycle/workspace-runtime'
import type { WorkspaceSocketMessage } from '../../src/shared/events'
import type { Attachment, MessageDraft } from '../../src/shared/messages'
import type {
  RunnerAttachment,
  RunnerChangeModel,
  RunnerInterrupt,
  RunnerLogin,
  WorkspaceToRunnerV1,
  WorkspaceToRunnerV2,
  RunnerEventEnvelope,
  RunnerProtocolVersion,
} from '../../src/shared/runner'
import type { WorkspaceEvent, WorkspaceEventEnvelope } from './workspace-events'
import type {
  ConnectionGrant,
  ConnectionIdentity,
  ConnectionScheduler,
} from '../security/connection-access'
import type { AuthenticatedRunner } from './authenticated-runner'
import type {
  SessionLoginMetadata,
  SessionLoginTarget,
} from './login-availability'
import type { FilteredRunnerOutput } from './runner-output'
import type { ChatTransaction } from './store'
import type { TurnTokenState } from '../model-gateway/token'
import type { TitleModelCall } from './title-model'

export interface ChatData {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<boolean>
  list<T>(options: {
    prefix: string
    startAfter?: string
    limit?: number
    end?: string
    reverse?: boolean
  }): Promise<Map<string, T>>
}

export interface ChatStorage extends ChatData {
  transaction<T>(work: (data: ChatData) => Promise<T>): Promise<T>
}

export interface WorkspaceRecord {
  id: string
  orgId: string
  archivedAt: number | null
}

export interface RunnerWorkspaceRecord extends WorkspaceRecord {
  /** Hash of the credential that authenticated this connection. */
  tokenHash: string
}

export interface StoredTurn {
  id: string
  sessionId: string
  senderId: string
  messageIds: string[]
  state: 'queued' | 'running' | 'stopping' | 'finished' | 'stopped' | 'failed'
  /** Retained dispatch evidence. Older records may have no evidence. */
  started?: boolean
  startedAt?: number
  closeAfterStop: boolean
  /** Internal waiting work. Older records have no successor. */
  nextTurnId?: string | null
  gateway?: TurnTokenState
  loginFailure?: string
}

export interface ModelSessionCreation {
  sourceSessionId: string
  requestedById: string
  choice: AgentChoice
  draft: MessageDraft
}

/** Credentials enter only the live command, after this record is read. */
export type PendingCommand =
  | {
      type: 'turn' | 'message'
      commandId: string
      sessionId: string
      turnId: string
      messageId: string
      attachments: readonly RunnerAttachment[]
    }
  | RunnerInterrupt
  | RunnerChangeModel

export interface RunnerPeer {
  send(message: WorkspaceToRunnerV1 | WorkspaceToRunnerV2): void
  close(): void
}

export interface ActiveRunner {
  peer: AuthenticatedRunner
  workspace: RunnerWorkspaceRecord
  streamId: string | null
  protocolVersion: RunnerProtocolVersion | null
  ready: boolean
  delivered: Set<string>
}

export interface BrowserPeer {
  send(message: WorkspaceSocketMessage): void
  close(): void
}

export interface ResolvedAttachments {
  attachments: readonly Attachment[]
  paths: readonly RunnerAttachment[]
}

/** Await this publisher inside a runner callback. Use appendWorkspaceEvent outside it. */
export type ChatCallbackPublisher = (
  event: WorkspaceEvent,
  occurredAt?: number,
) => Promise<void>

export interface ChatDependencies {
  readBranches(
    workspaceId: string,
  ): Promise<import('../../src/shared/runner').RunnerBranches | null>
  readAutomaticTitleWorkspace: (
    workspaceId: string,
  ) => Promise<{ name: string | null } | null>
  runTitleModel?: TitleModelCall
  filterRunnerOutput(
    transaction: ChatTransaction,
    workspace: RunnerWorkspaceRecord,
    input: RunnerEventEnvelope,
  ): Promise<FilteredRunnerOutput>
  runnerAttached(
    workspaceId: string,
    connectionId: string,
    send: (
      command: import('../../src/shared/runner-files').RunnerFileCommand,
    ) => Promise<boolean>,
  ): void
  runnerDetached(connectionId: string): void
  waitUntil(promise: Promise<unknown>): void
  runnerDisconnected(
    workspaceId: string,
    publish: ChatCallbackPublisher,
  ): Promise<void>
  turnDispatching(
    workspaceId: string,
    turn: PendingTurn,
    publish: ChatCallbackPublisher,
  ): Promise<boolean>
  turnDispatchFailed(
    workspaceId: string,
    turnId: string,
    publish: ChatCallbackPublisher,
  ): Promise<void>
  turnEnded(
    workspaceId: string,
    turnId: string,
    publish: ChatCallbackPublisher,
    occurredAt: number,
  ): Promise<void>
  browserOpened(workspaceId: string, tabId: string): Promise<void>
  browserClosed(workspaceId: string, tabId: string): Promise<void>
  now: () => number
  scheduleBrowserCheck: ConnectionScheduler
  scheduleRunnerCheck: ConnectionScheduler
  readRunnerAccess: (workspaceId: string, tokenHash: string) => Promise<boolean>
  readRunnerProtocolVersion: (workspaceId: string) => Promise<number | null>
  readConnectionAccess: (
    identities: readonly ConnectionIdentity[],
    now: number,
  ) => Promise<readonly ConnectionGrant[]>
  randomId: () => string
  randomConnectionId: () => string
  readLoginMetadata: (
    targets: readonly SessionLoginTarget[],
  ) => Promise<ReadonlyMap<string, SessionLoginMetadata>>
  resolveLogin: (
    userId: string | null,
    agent: Agent,
    runnerTokenHash?: string,
    senderId?: string,
  ) => Promise<RunnerLogin | null>
  resolveAttachments: (
    userId: string,
    workspaceId: string,
    ids: readonly string[],
    messageId: string,
    usedIds: readonly string[],
  ) => Promise<ResolvedAttachments>
  prepareAttachments: (
    workspaceId: string,
    userId: string,
    messageId: string,
    attachments: readonly RunnerAttachment[],
    sandboxId: string | null,
  ) => Promise<string | null>
  attachmentSandboxId: (
    workspaceId: string,
    userId: string,
  ) => Promise<string | null>
  /** File owners validate results here. Results never enter history. */
  receiveFileResult: (value: unknown, connectionId: string) => Promise<void>
  /** The supplied publisher preserves the callback's place in the serial task. */
  runnerEventStored: (
    envelope: WorkspaceEventEnvelope,
    publish: ChatCallbackPublisher,
  ) => Promise<void>
  runnerReady: (
    workspaceId: string,
    publish: ChatCallbackPublisher,
  ) => Promise<void>
  runnerHello: (
    workspaceId: string,
    publish: ChatCallbackPublisher,
  ) => Promise<void>
  matchesObject: (workspaceId: string) => boolean
}
