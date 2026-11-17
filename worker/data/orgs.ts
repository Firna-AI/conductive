import type { OrgSummary } from '../../src/shared/orgs'
import type { Org } from '../../src/shared/api'

type OrgRow = Org & {
  initials: string | null
  color: string | null
  suspendedAt: number | null
}

export async function findMembership(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<OrgSummary | null> {
  const row = await db
    .prepare(
      `SELECT orgs.id, orgs.name, orgs.initials, orgs.color, org_members.role,
       orgs.suspended_at AS suspendedAt
     FROM orgs JOIN org_members ON org_members.org_id = orgs.id
     WHERE orgs.id = ? AND org_members.user_id = ? AND orgs.deleted_at IS NULL`,
    )
    .bind(orgId, userId)
    .first<OrgRow>()
  return row ? orgSummary(row) : null
}

function orgSummary(row: OrgRow): OrgSummary {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    ...(row.initials !== null ? { initials: row.initials } : {}),
    ...(row.color !== null ? { color: row.color } : {}),
    ...(row.suspendedAt !== null
      ? { suspension: { suspendedAt: row.suspendedAt } }
      : {}),
  }
}
