import {
  parentDepthStatement,
  type WorkspaceParent,
} from '../lifecycle/workspace-insert-data'

export function workspaceParent(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<WorkspaceParent | null> {
  return parentDepthStatement(db, orgId, workspaceId).first<WorkspaceParent>()
}
