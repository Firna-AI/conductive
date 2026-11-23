import type { SessionLogin } from '../../src/shared/generated/SessionLogin'
import type { Agent } from '../../src/shared/generated/Agent'
import type { AgentChoice } from '../../src/shared/generated/AgentChoice'
import type { CommitAuthor } from '../../src/shared/generated/CommitAuthor'
import type { Attachment } from '../../src/shared/generated/Attachment'
import type { RunnerAttachment } from '../../src/shared/generated/RunnerAttachment'
import type { RunnerCapabilities } from '../../src/shared/generated/RunnerCapabilities'
import type { RunnerChangeModel } from '../../src/shared/generated/RunnerChangeModel'
import type { RunnerCommand } from '../../src/shared/generated/RunnerCommand'
import type { RunnerInterrupt } from '../../src/shared/generated/RunnerInterrupt'
import type { RunnerNotice } from '../../src/shared/generated/RunnerNotice'
import type { WorkspaceToRunner } from '../../src/shared/generated/WorkspaceToRunner'
import type { RunnerEventEnvelope } from '../../src/shared/generated/RunnerEventEnvelope'
import type { TurnEndReason } from '../../src/shared/generated/TurnEndReason'
import type { TurnStopRequester } from '../../src/shared/session-stop'
import type { PendingTurn } from '../lifecycle/workspace-runtime'
import type { WorkspaceSocketMessage } from '../../src/shared/events'
import type { MessageDraft } from '../../src/shared/messages'
import type { WorkspaceEvent, WorkspaceEventEnvelope } from './workspace-events'
import type {
  ConnectionGrant,
  ConnectionIdentity,
  ConnectionScheduler,
} from '../security/connection-access'
import type { AuthenticatedRunner } from './authenticated-runner'
import type { SessionLoginMetadata } from './login-availability'
import type { SessionLoginTarget } from './login-access-data'
import type { AgentLoginOwner } from './queries'
import type { FilteredRunnerOutput } from './runner-output'
import type { ChatTransaction } from './store'
import type { TurnTokenState } from '../model-gateway/token'
import type { TitleModelCall } from './title-model'
import type { AgentLogin } from './login-kind'
import type { RunnerRepositoryRecord } from './branch-data'
import type { RunnerConnectionState } from './runner-connection-state'

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
  error?: { code: string; message: string }
  /** Retained dispatch evidence. Older records may have no evidence. */
  started?: boolean
  startedAt?: number
  /** Fast was requested but absent from the runner's started choice. */
  olderRunner?: true
  closeAfterStop: boolean
  stopRequest?: TurnStopRequester | null
  /** Internal waiting work. Older records have no successor. */
  nextTurnId?: string | null
  gateway?: TurnTokenState
  /** The dispatched own endpoint model, without login metadata or secrets. */
  endpointModel?: string
  loginFailure?: string
  endReason?: TurnEndReason
}

export interface ModelSessionCreation {
  sourceSessionId: string
  requestedById: string
  choice: AgentChoice
  draft: MessageDraft
}

/** Only live runner commands carry absolute attachment paths. */
export interface StoredAttachment {
  attachmentId: string
  relativePath: string
}

export type PreparedMessageCommand = (
  | Omit<Extract<RunnerCommand, { type: 'turn' }>, 'attachments' | 'credential'>
  | Omit<Extract<RunnerCommand, { type: 'message' }>, 'attachments'>
) & { attachments: readonly StoredAttachment[]; login: AgentLogin }

export type PreparedCommand =
  PreparedMessageCommand | RunnerInterrupt | RunnerChangeModel | RunnerNotice

type ResolveCommand<Command> = Command extends PreparedMessageCommand
  ? Omit<Command, 'attachments'> & { attachments: readonly RunnerAttachment[] }
  : Command

export type ResolvedCommand = ResolveCommand<PreparedCommand>

export interface RunnerPeer {
  send(message: WorkspaceToRunner): void
  close(): void
}

export interface ActiveRunner {
  state: RunnerConnectionState
  /** Memory only. A wake rebuilds this handle for the retained socket. */
  peer: AuthenticatedRunner
}

export interface BrowserPeer {
  send(message: WorkspaceSocketMessage): void
  close(): void
}

export interface ResolvedAttachments {
  attachments: readonly Attachment[]
  paths: readonly StoredAttachment[]
}

/** Await this publisher inside a runner callback. Use appendWorkspaceEvent outside it. */
export type ChatCallbackPublisher = (
  event: WorkspaceEvent,
  occurredAt?: number,
) => Promise<void>

export interface ChatDependencies {
  normalizeChoice(choice: AgentChoice): AgentChoice
  refreshEndpointModels(owner: AgentLoginOwner, agent: Agent): Promise<void>
  readBranches(
    workspaceId: string,
  ): Promise<
    import('../../src/shared/generated/RunnerBranches').RunnerBranches | null
  >
  readCapabilities(
    workspaceId: string,
    sessionId: string,
  ): Promise<RunnerCapabilities | null>
  /** The record repository and the stored folders, or null without them. */
  readRepository(workspaceId: string): Promise<RunnerRepositoryRecord | null>
  readCommitAuthor: (userId: string) => Promise<CommitAuthor | null>
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
      command: import('../../src/shared/generated/RunnerFileCommand').RunnerFileCommand,
    ) => Promise<boolean>,
  ): void
  runnerDetached(connectionId: string): void
  waitUntil(promise: Promise<unknown>): void
  runnerDisconnected(
    workspaceId: string,
    publish: ChatCallbackPublisher,
    at: number,
  ): Promise<void>
  runnerUnsupported(
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
  scheduleBrowserCheck?: ConnectionScheduler
  browserAlarm?: (at: number | null) => Promise<void>
  scheduleRunnerCheck?: ConnectionScheduler
  runnerAlarm?: (at: number | null) => Promise<void>
  /** Keeps the mark of runner work. Without it, the workspace marks nothing. */
  runnerWork?: import('./runner-work-watch').RunnerWorkStorage
  /** Stores the due time of the automation report retry, unless an earlier one is due. */
  automationReportAlarm?: (at: number) => Promise<void>
  sessionWatchAlarm?: (
    at: number | null,
    keepEarlier?: boolean,
  ) => Promise<void>
  readRunnerAccess: (workspaceId: string, tokenHash: string) => Promise<boolean>
  readRunnerProtocolVersion: (workspaceId: string) => Promise<number | null>
  requiresFreshRunnerReady?(): Promise<boolean>
  readConnectionAccess: (
    identities: readonly ConnectionIdentity[],
    now: number,
  ) => Promise<readonly ConnectionGrant[]>
  randomId: () => string
  randomConnectionId: () => string
  refusedEndpointDomains: () => readonly string[]
  readLoginMetadata: (
    targets: readonly SessionLoginTarget[],
  ) => Promise<ReadonlyMap<string, SessionLoginMetadata>>
  resolveDefaultLogin: (
    userId: string,
    agent: Agent,
    excluded?: SessionLogin,
  ) => Promise<SessionLogin | null>
  readOrgName: (orgId: string) => Promise<string | null>
  resolveLogin: (
    login: SessionLogin | null,
    agent: Agent,
    runnerTokenHash?: string,
    senderId?: string,
  ) => Promise<AgentLogin | null>
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
    attachments: readonly StoredAttachment[],
    sandboxId: string | null,
  ) => Promise<string | null>
  completeAttachments: (
    workspaceId: string,
    attachments: readonly StoredAttachment[],
    sandboxId: string | null,
  ) => Promise<void>
  resolveAttachmentPaths: (
    workspaceId: string,
    userId: string,
    attachments: readonly StoredAttachment[],
  ) => Promise<readonly RunnerAttachment[]>
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
