export interface RestoreRequest {
  requestId: string
  requestedAt: number
  requestedByUserId: string
}

export async function cancelRestoreRequest(
  db: D1Database,
  orgId: string,
  token: string,
) {
  await db
    .prepare(
      `UPDATE org_deletions SET restore_request_id = NULL, restore_requested_at = NULL,
     restore_requested_by_user_id = NULL WHERE org_id = ? AND lease_token = ?`,
    )
    .bind(orgId, token)
    .run()
}

export async function saveRestoreRequest(
  db: D1Database,
  orgId: string,
  actorId: string,
  token: string,
  requestId: string,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE org_deletions SET
       restore_request_id = CASE WHEN restore_requested_by_user_id = ? THEN COALESCE(restore_request_id, ?) ELSE ? END,
       restore_requested_at = CASE WHEN restore_requested_by_user_id = ? THEN COALESCE(restore_requested_at, ?) ELSE ? END,
       restore_requested_by_user_id = ?
     WHERE org_id = ? AND lease_token = ? AND purge_started_at IS NULL
     AND EXISTS (SELECT 1 FROM orgs WHERE id = ? AND deleted_at IS NOT NULL AND purge_after > ?)
     AND EXISTS (SELECT 1 FROM org_members WHERE org_id = ? AND user_id = ? AND role = 'admin')`,
    )
    .bind(
      actorId,
      requestId,
      requestId,
      actorId,
      now,
      now,
      actorId,
      orgId,
      token,
      orgId,
      now,
      orgId,
      actorId,
    )
    .run()
  return result.meta.changes > 0
}

export function pendingRestoreRequest(
  db: D1Database,
  orgId: string,
  token: string,
  now: number,
) {
  return db
    .prepare(
      `SELECT d.restore_request_id AS requestId, d.restore_requested_at AS requestedAt,
     d.restore_requested_by_user_id AS requestedByUserId FROM org_deletions d JOIN orgs o ON o.id = d.org_id
     JOIN org_members m ON m.org_id = d.org_id AND m.user_id = d.restore_requested_by_user_id
     WHERE d.org_id = ? AND d.lease_token = ? AND d.restore_request_id IS NOT NULL
     AND m.role = 'admin' AND o.deleted_at IS NOT NULL AND o.purge_after > ? AND d.purge_started_at IS NULL`,
    )
    .bind(orgId, token, now)
    .first<RestoreRequest>()
}

export async function restoreOrgRecords(
  db: D1Database,
  orgId: string,
  actorId: string,
  token: string,
  requestId: string,
  now: number,
) {
  const result = await db.batch([
    db
      .prepare(
        `UPDATE orgs SET deleted_at = NULL, purge_after = NULL WHERE id = ? AND purge_after > ?
       AND EXISTS (SELECT 1 FROM org_deletions WHERE org_id = ? AND lease_token = ? AND purge_started_at IS NULL
         AND restore_request_id = ? AND restore_requested_by_user_id = ?)
       AND EXISTS (SELECT 1 FROM org_members WHERE org_id = ? AND user_id = ? AND role = 'admin')`,
      )
      .bind(orgId, now, orgId, token, requestId, actorId, orgId, actorId),
    db
      .prepare(
        'DELETE FROM org_deletions WHERE org_id = ? AND EXISTS (SELECT 1 FROM orgs WHERE id = ? AND deleted_at IS NULL)',
      )
      .bind(orgId, orgId),
  ])
  return result[0].meta.changes > 0
}
