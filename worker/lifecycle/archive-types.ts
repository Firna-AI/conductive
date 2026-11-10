import type { StoredWorkspaceStartJob } from './start-job-codec'
import type { ArchiveResource } from './archive-data'

export const ARCHIVE_STATE_KEY = 'lifecycle:archive-state'
export const ARCHIVE_REVISION_KEY = 'lifecycle:archive-revision'
export const ARCHIVE_RESERVATION_KEY = 'lifecycle:archive-reservation'

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
