import { readContinueStopCause } from './lifecycle/continue-stop-causes'
import { CONTINUE_PHASES } from './lifecycle/continue-types'
import type { WorkerWarning } from './warning-types'

export function continueEndWarningFields(
  warning: Extract<WorkerWarning, { kind: 'workspace_continue_ended' }>,
) {
  return {
    kind: warning.kind,
    message: 'Continue ended as failed.',
    workspaceId: warning.workspaceId.text,
    phase:
      CONTINUE_PHASES.find((phase) => phase === warning.phase) ?? 'unknown',
    stopCause: readContinueStopCause(warning.stopCause),
  }
}
