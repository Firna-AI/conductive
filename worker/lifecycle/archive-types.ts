import type { StoredWorkspaceStartJob } from './start-job-codec'
import type { ArchiveResource } from './archive-data'

export const ARCHIVE_STATE_KEY = 'lifecycle:archive-state'
export const ARCHIVE_REVISION_KEY = 'lifecycle:archive-revision'
export const ARCHIVE_RESERVATION_KEY = 'lifecycle:archive-reservation'

/** The failed steps in a row, and the time of the next try. */
export interface ArchiveRetry {
  failures: number
  at: number
}

export interface WorkspaceArchiveState {
  revision: number
  workspaceId: string
  orgId: string
  archivedAt: number
  sandboxId: string | null
  providerAccount: string
  phase:
    | 'initializing'
    | 'resolve'
    | 'stop'
    | 'retained'
    | 'resume'
    | 'wait'
    | 'purge'
  stoppedAt: number | null
  stopRequestedAt?: number
  maintenanceDeadlineAt?: number
  allocation?: StoredWorkspaceStartJob
  published?: string
  retry?: ArchiveRetry
}

export function sameArchive(
  row: ArchiveResource | null,
  state: WorkspaceArchiveState,
): boolean {
  return (
    row !== null &&
    row.archivedAt === state.archivedAt &&
    row.providerAccount === state.providerAccount &&
    row.orgId === state.orgId
  )
}
