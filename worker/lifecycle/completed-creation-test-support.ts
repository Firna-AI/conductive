import type { createWorkspace } from './workspaces'
import { createWorkspace as admitWorkspace } from './workspaces'
import { WorkspaceStartError } from './workspace-start'

/** Tests of a running sandbox explicitly wait past the public admission boundary. */
export const createCompletedWorkspace: typeof createWorkspace = async (
  ...args
) => {
  const created = await admitWorkspace(...args)
  const result = await args[0]
    .workspace(created.workspace.id)
    .waitCreationLifecycle()
  if (!result.ok)
    throw Object.assign(new WorkspaceStartError(result.error.log), result.error)
  return created
}
