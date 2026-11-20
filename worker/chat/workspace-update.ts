import { readWorkspace, workspaceRecord } from '../lifecycle/workspace-data'
import type { WorkspaceEvent } from './workspace-events'

/**
 * The event that gives open tabs the current D1 record of a workspace, such
 * as its name and its branch after a rename.
 */
export async function workspaceUpdate(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<WorkspaceEvent> {
  return {
    type: 'workspace.updated',
    workspace: workspaceRecord(await readWorkspace(db, orgId, workspaceId)),
  }
}
