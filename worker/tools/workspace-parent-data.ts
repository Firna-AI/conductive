export function workspaceParent(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<{ number: number; parentId: string | null; depth: number } | null> {
  return db
    .prepare(
      `WITH RECURSIVE ancestors AS (
       SELECT id, number, parent_workspace_id AS parentId, 0 AS depth
       FROM workspaces WHERE org_id = ? AND id = ?
       UNION ALL
       SELECT w.id, w.number, w.parent_workspace_id, a.depth + 1
       FROM workspaces w JOIN ancestors a ON w.id = a.parentId WHERE w.org_id = ?
      ) SELECT number, parentId, (SELECT MAX(depth) FROM ancestors) AS depth
      FROM ancestors WHERE depth = 0`,
    )
    .bind(orgId, workspaceId, orgId)
    .first()
}
