import type { WorkspaceArchiveState } from './archive-types'
import { errorSummary, WarningId } from '../warning-values'
import { warnWorker } from '../warnings'
import { captureWorkerWarning } from '../error-reporting/policy'

export function warnArchiveFailure(
  state: Pick<WorkspaceArchiveState, 'workspaceId' | 'phase'>,
  error: unknown,
): void {
  const warning = {
    kind: 'workspace_archive_failed',
    workspaceId: WarningId.checked(state.workspaceId),
    phase: state.phase,
    error: errorSummary(error),
  } as const
  warnWorker(warning)
  captureWorkerWarning(warning, error)
}
