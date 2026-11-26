import type { WorkspaceState } from '../../shared/generated/WorkspaceState'
import { restartableStates } from '../../ui/components/workspace/restartCopy'

/**
 * Whether the viewer may restart the software of the workspace, as Restart
 * in the header offers it: the workspace takes changes, and its software
 * runs. Stop and Restart of a service follow the same rule. The API checks
 * the right again at each request.
 */
export function mayRestartSoftware(
  readOnly: boolean,
  state: WorkspaceState,
): boolean {
  return !readOnly && restartableStates.has(state)
}
