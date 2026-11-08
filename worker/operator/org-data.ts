import { HttpError } from '../http'

export async function recordOrgSuspension(
  db: D1Database,
  orgId: string,
  operatorId: string,
  now: number,
): Promise<{ orgId: string; suspendedAt: number }> {
  const org = await db
    .prepare(
      `UPDATE orgs SET suspended_at = COALESCE(suspended_at, ?),
       suspended_by_user_id = COALESCE(suspended_by_user_id, ?)
       WHERE id = ? RETURNING id AS orgId, suspended_at AS suspendedAt`,
    )
    .bind(now, operatorId, orgId)
    .first<{ orgId: string; suspendedAt: number }>()
  if (!org)
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  await db.batch([
    db
      .prepare(
        `UPDATE workspace_tokens SET revoked_at = ? WHERE revoked_at IS NULL
         AND workspace_id IN (SELECT id FROM workspaces WHERE org_id = ?)`,
      )
      .bind(now, orgId),
    db
      .prepare(
        'UPDATE preview_hostnames SET revoked_at = ? WHERE org_id = ? AND revoked_at IS NULL',
      )
      .bind(now, orgId),
  ])
  return org
}

export async function orgWorkspaces(db: D1Database, orgId: string) {
  return (
    await db
      .prepare(
        'SELECT id, owner_user_id AS ownerUserId FROM workspaces WHERE org_id = ? ORDER BY id',
      )
      .bind(orgId)
      .all<{ id: string; ownerUserId: string }>()
  ).results
}

export async function orgBuilds(db: D1Database, orgId: string) {
  return (
    await db
      .prepare(
        `SELECT b.id FROM image_builds b JOIN image_build_jobs j ON j.build_id = b.id
         WHERE b.org_id = ? AND j.phase != 'done' ORDER BY b.id`,
      )
      .bind(orgId)
      .all<{ id: string }>()
  ).results
}
