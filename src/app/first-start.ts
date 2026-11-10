import type {
  Workspace,
  WorkspaceResponse,
  WorkspaceStart,
} from '../shared/workspaces'

/**
 * A workspace from Conductor whose activation has not succeeded yet: before
 * its first Activate, while an activation runs, after a failed one, and
 * after an Archive or a Restore before one succeeded. Only Activate starts
 * it. An open of the workspace, of a file, or of an old session starts
 * nothing, and it shows no project files until an activation succeeds.
 */
export function awaitsActivation(
  workspace: Pick<Workspace, 'conductorImport'> | null | undefined,
): boolean {
  return workspace?.conductorImport?.activatedAt === null
}

/**
 * The first start of a new workspace failed: the workspace shows the error
 * state, and its create start shows a failed step. The workspace stays with
 * its chat and its queued messages, so the composer stays under the bar,
 * and Try again starts a new cloud computer in the same workspace. A failed
 * activation of a workspace from Conductor is its failed first start too,
 * also when the page has no start steps for it, and so is an activation
 * that stopped, such as after the Restore of an Archive during it.
 *
 * A later error after a successful create keeps the completed create start,
 * which shows no failed step. A failed resume has a resume start. Both keep
 * the bar in place of the composer.
 */
export function failedFirstStart(
  workspace: Pick<Workspace, 'state' | 'conductorImport'> | null,
  start: WorkspaceStart | null,
): boolean {
  if (awaitsActivation(workspace)) {
    return workspace?.state === 'error' || workspace?.state === 'stopped'
  }
  if (workspace?.state !== 'error') return false
  return (
    start?.kind === 'create' &&
    start.steps.some((step) => step.state === 'failed')
  )
}

/**
 * Whether an open resumes the sandbox: a stopped workspace, and one whose
 * later start failed. A failed first start waits for Try again, so that
 * each member and each return sees its saved cause first. A workspace from
 * Conductor that waits for its activation starts only with Activate.
 */
export function resumesAtOpen(
  detail: Pick<WorkspaceResponse, 'workspace' | 'start'>,
): boolean {
  if (awaitsActivation(detail.workspace)) return false
  const { state } = detail.workspace
  if (state === 'stopped') return true
  return state === 'error' && !failedFirstStart(detail.workspace, detail.start)
}
