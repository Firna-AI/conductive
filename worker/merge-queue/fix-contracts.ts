import type { QueueEntry, QueueScope } from './contracts'

export interface QueueRestack {
  id: string
  base: string
  baseHead: string
  oldBase: string
  basePullNumber?: number | null
  sync?: { head: string }
}

export type QueueFixEntry = Pick<
  QueueEntry,
  | 'workspaceId'
  | 'branch'
  | 'pullNumber'
  | 'queuerUserId'
  | 'queuedAt'
  | 'unitId'
>

export interface QueueFixRequest {
  scope: QueueScope
  entry: QueueFixEntry
  restack: QueueRestack
  messageId: string
}

/** The queue no longer sets `open-session`, but older entries can hold it. */
export type QueueFixWait = 'active-turn' | 'agent-login'

export type QueueFixAdmission =
  | { kind: 'waiting'; wait: QueueFixWait }
  | { kind: 'deferred' }
  | { kind: 'accepted'; turnId: string; queued: boolean }

export interface QueueFixEnd {
  messageId: string
  turnId: string
  state: 'finished' | 'failed' | 'stopped'
  endedAt: number
}

export type QueueFix = QueueFixRequest &
  (
    | { state: 'pending'; mayHaveMessage?: true }
    | { state: 'sent'; turnId: string }
    | { state: 'ended'; result: QueueFixEnd }
  )

export function sameFixEntry(
  entry: QueueFixEntry | null,
  expected: QueueFixEntry,
): boolean {
  return (
    entry?.workspaceId === expected.workspaceId &&
    entry.branch === expected.branch &&
    entry.pullNumber === expected.pullNumber &&
    entry.queuerUserId === expected.queuerUserId &&
    entry.queuedAt === expected.queuedAt &&
    entry.unitId === expected.unitId
  )
}
