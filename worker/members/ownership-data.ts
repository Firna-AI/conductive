import { activeAdminPredicate } from './org-data'

export function updateWorkspaceOwner(
  db: D1Database,
  orgId: string,
  actorId: string,
  workspaceId: string,
  userId: string,
  now: number,
) {
  return db
    .prepare(
      `UPDATE workspaces SET owner_user_id = ?, updated_at = ? WHERE org_id = ? AND id = ?
     AND ${activeAdminPredicate} AND EXISTS (
       SELECT 1 FROM org_members JOIN users recipient ON recipient.id = org_members.user_id
       WHERE org_id = ? AND user_id = ? AND recipient.suspended_at IS NULL
     ) RETURNING id`,
    )
    .bind(userId, now, orgId, workspaceId, orgId, actorId, orgId, userId)
    .first<{ id: string }>()
}
