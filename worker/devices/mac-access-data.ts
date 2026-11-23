import { workspaceNameColumn } from '../data/workspace-name'

export function readMacAccessWorkspace(db: D1Database, workspaceId: string) {
  return db
    .prepare(
      `SELECT w.org_id AS orgId, ${workspaceNameColumn('w')},
       w.archived_at AS archivedAt, w.state
       FROM workspaces w WHERE w.id = ?`,
    )
    .bind(workspaceId)
    .first<{
      orgId: string
      name: string | null
      archivedAt: number | null
      state: string
    }>()
}
