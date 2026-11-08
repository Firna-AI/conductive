import type { SendMessageRequest } from '../../src/shared/messages'
import type {
  WorkspaceStart,
  WorkspaceState,
} from '../../src/shared/workspaces'

export const IDLE_MS = 30 * 60 * 1_000
export const DISK_KEEPALIVE_MS = 13 * 24 * 60 * 60 * 1_000
export const TURN_HEARTBEAT_MS = 5 * 60 * 1_000
export const LIFECYCLE_STATE_KEY = 'lifecycle:state'

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
  diskRetentionDeadlineAt?: number
  error: { code: string; message: string; log: string | null } | null
}

export interface DiskRetentionResult {
  done: boolean
  error: string | null
}

export interface LifecycleHooks {
  changed(state: DurableLifecycleState): void | Promise<void>
  stop(): Promise<LifecycleStopResult | void>
  keepalive(deadlineAt: number): Promise<DiskRetentionResult>
  extendDeadline(): Promise<LifecycleReconciliation | void>
  reconcile?(): Promise<LifecycleReconciliation>
  startPending?(): Promise<boolean>
}

export type LifecycleReconciliation = 'stopped' | 'error' | undefined
export type LifecycleStopResult = 'stopped' | 'error' | 'pending'
