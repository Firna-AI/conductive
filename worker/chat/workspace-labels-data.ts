export function workspaceOutputIdentity(
  db: D1Database,
  workspaceId: string,
): Promise<{ id: string; orgId: string } | null> {
  return db
    .prepare('SELECT id, org_id AS orgId FROM workspaces WHERE id = ?')
    .bind(workspaceId)
    .first<{ id: string; orgId: string }>()
}
