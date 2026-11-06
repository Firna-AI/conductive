import type { WorkspaceTarget } from './types'

export function readWorkspaceTarget(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  userId?: string,
): Promise<WorkspaceTarget | null> {
  return db
    .prepare(
      `SELECT w.org_id AS orgId, w.id AS workspaceId, w.sandbox_id AS sandboxId, w.state
     FROM workspaces w JOIN orgs o ON o.id = w.org_id
     WHERE w.org_id = ? AND w.id = ? AND w.archived_at IS NULL AND o.deleted_at IS NULL
     AND (? IS NULL OR EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = w.org_id AND m.user_id = ?))`,
    )
    .bind(orgId, workspaceId, userId ?? null, userId ?? null)
    .first<WorkspaceTarget>()
}

export async function writeWorkspaceActivity(
  db: D1Database,
  workspaceId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE workspaces SET last_activity_at = MAX(COALESCE(last_activity_at, 0), ?)
     WHERE id = ? AND archived_at IS NULL`,
    )
    .bind(now, workspaceId)
    .run()
}
