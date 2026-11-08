import type { SendMessageRequest } from '../../src/shared/messages'
import type { WorkspacePlatform } from './workspace-platform'

export type LifecyclePublisher = WorkspacePlatform['publish']
import type {
  WorkspaceStart,
  WorkspaceState,
} from '../../src/shared/workspaces'

export const IDLE_MS = 30 * 60 * 1_000
export const DISK_KEEPALIVE_MS = 13 * 24 * 60 * 60 * 1_000
export const TURN_HEARTBEAT_MS = 5 * 60 * 1_000

export interface LifecycleStorage {
  get(key: string): Promise<DurableLifecycleState | undefined>
  put(key: string, value: DurableLifecycleState): Promise<void>
  delete(key: string): Promise<boolean>
  setAlarm(timestamp: number): Promise<void>
  deleteAlarm(): Promise<void>
}

export interface DurableLifecycleState {
  workspaceId: string
  orgId: string
  state: WorkspaceState
  start: WorkspaceStart | null
  pendingFirstMessage: SendMessageRequest | null
  lastActivityAt: number
  runningSessions: readonly string[]
  runnerConnected: boolean
  startupPrepared?: boolean
  stoppedAt: number | null
  nextDiskKeepaliveAt: number | null
  error: { code: string; message: string; log: string | null } | null
}

export interface LifecycleHooks {
  changed(
    state: DurableLifecycleState,
    publish?: LifecyclePublisher,
  ): void | Promise<void>
  stop(): Promise<LifecycleStopResult | void>
  keepalive(): Promise<boolean | void>
  extendDeadline(): Promise<LifecycleReconciliation | void>
  reconcile?(): Promise<LifecycleReconciliation>
  startPending?(): Promise<boolean>
  recoverTurns?(workspaceId: string): Promise<LifecycleTurnRecovery | undefined>
}

export interface LifecycleTurnRecovery {
  runningSessions: readonly string[]
  lastTurnEndedAt: number | null
}

export type LifecycleReconciliation = 'stopped' | 'error' | undefined
export type LifecycleStopResult = 'stopped' | 'error' | 'pending'
