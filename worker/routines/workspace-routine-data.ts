export function workspaceRoutine(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<{ id: string; name: string } | null> {
  return db
    .prepare(
      `SELECT r.id, r.name FROM routines r JOIN routine_runs run ON run.routine_id = r.id AND run.org_id = r.org_id
    WHERE run.org_id = ? AND run.workspace_id = ? LIMIT 1`,
    )
    .bind(orgId, workspaceId)
    .first()
}
