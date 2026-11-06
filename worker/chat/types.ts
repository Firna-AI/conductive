import type { Agent } from '../../src/shared/agents'
import type { WorkspaceSocketMessage } from '../../src/shared/events'
import type { Attachment } from '../../src/shared/messages'
import type {
  RunnerAttachment,
  RunnerChangeModel,
  RunnerInterrupt,
  RunnerLogin,
  WorkspaceToRunner,
} from '../../src/shared/runner'
import type {
  WorkspaceEvent,
  WorkspaceEventEnvelope,
} from '../../src/shared/events'

export interface ChatData {
  get<T>(key: string): Promise<T | undefined>
  put<T>(key: string, value: T): Promise<void>
  delete(key: string): Promise<boolean>
  list<T>(options: {
    prefix: string
    startAfter?: string
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

export interface StoredTurn {
  id: string
  sessionId: string
  senderId: string
  messageIds: string[]
  state: 'queued' | 'running' | 'stopping' | 'finished' | 'stopped' | 'failed'
  closeAfterStop: boolean
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
  send(message: WorkspaceToRunner): void
  close(): void
}

export interface ActiveRunner {
  peer: RunnerPeer
  workspace: WorkspaceRecord
  streamId: string | null
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
  now: () => number
  randomId: () => string
  resolveLogin: (userId: string, agent: Agent) => Promise<RunnerLogin | null>
  resolveAttachments: (
    userId: string,
    workspaceId: string,
    ids: readonly string[],
  ) => Promise<ResolvedAttachments>
  /** File owners validate results here. Results never enter history. */
  receiveFileResult: (value: unknown) => Promise<void>
  /** The supplied publisher preserves the callback's place in the serial task. */
  runnerEventStored: (
    envelope: WorkspaceEventEnvelope,
    publish: ChatCallbackPublisher,
  ) => Promise<void>
  runnerReady: (
    workspaceId: string,
    publish: ChatCallbackPublisher,
  ) => Promise<void>
  matchesObject: (workspaceId: string) => boolean
}
