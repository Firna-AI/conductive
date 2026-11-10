import { workspaceTokenResourcePredicate } from '../data/workspace-token-access'

export async function gatewayWorkspaceAllowed(
  db: D1Database,
  workspaceId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT w.id FROM workspaces w
       WHERE w.id = ? AND ${workspaceTokenResourcePredicate}
         AND w.state NOT IN ('stopped', 'archived', 'error')`,
    )
    .bind(workspaceId)
    .first<{ id: string }>()
  return row !== null
}
