import type { Org } from '../../src/shared/api'

export function findMembership(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<Org | null> {
  return db
    .prepare(
      `SELECT orgs.id, orgs.name, org_members.role
     FROM orgs JOIN org_members ON org_members.org_id = orgs.id
     WHERE orgs.id = ? AND org_members.user_id = ? AND orgs.deleted_at IS NULL`,
    )
    .bind(orgId, userId)
    .first<Org>()
}
