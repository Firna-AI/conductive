import { workspaceNameColumn } from '../data/workspace-name'

export function readMacAccessWorkspace(db: D1Database, workspaceId: string) {
  return db
    .prepare(
      `SELECT w.org_id AS orgId, ${workspaceNameColumn('w')},
       w.archived_at AS archivedAt, w.state, w.mac_access AS macAccess,
       w.mac_access_period AS macAccessPeriod
       FROM workspaces w WHERE w.id = ?`,
    )
    .bind(workspaceId)
    .first<{
      orgId: string
      name: string | null
      archivedAt: number | null
      state: string
      macAccess: number
      macAccessPeriod: number
    }>()
}

export async function workspaceMacAccessPeriod(
  db: D1Database,
  workspaceId: string,
): Promise<number | undefined> {
  const row = await db
    .prepare('SELECT mac_access_period AS period FROM workspaces WHERE id = ?')
    .bind(workspaceId)
    .first<{ period: number }>()
  return row?.period
}

export async function workspaceMacAccessPeriods(
  db: D1Database,
  workspaceIds: readonly string[],
): Promise<Map<string, number>> {
  if (!workspaceIds.length) return new Map()
  const rows = await db
    .prepare(
      `SELECT id, mac_access_period AS period FROM workspaces
       WHERE id IN (SELECT value FROM json_each(?))`,
    )
    .bind(JSON.stringify(workspaceIds))
    .all<{ id: string; period: number }>()
  return new Map(rows.results.map(({ id, period }) => [id, period]))
}
