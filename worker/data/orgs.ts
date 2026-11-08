import type { OrgSummary } from '../../src/shared/orgs'
import type { Org } from '../../src/shared/api'

export async function findMembership(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<OrgSummary | null> {
  const row = await db
    .prepare(
      `SELECT orgs.id, orgs.name, org_members.role,
       orgs.suspended_at AS suspendedAt
     FROM orgs JOIN org_members ON org_members.org_id = orgs.id
     WHERE orgs.id = ? AND org_members.user_id = ? AND orgs.deleted_at IS NULL`,
    )
    .bind(orgId, userId)
    .first<Org & { suspendedAt: number | null }>()
  return row ? orgSummary(row) : null
}

export async function listOrgs(
  db: D1Database,
  userId: string,
): Promise<OrgSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT orgs.id, orgs.name, org_members.role,
       orgs.suspended_at AS suspendedAt
     FROM orgs JOIN org_members ON org_members.org_id = orgs.id
     WHERE org_members.user_id = ? AND orgs.deleted_at IS NULL
     ORDER BY orgs.created_at, orgs.id`,
    )
    .bind(userId)
    .all<Org & { suspendedAt: number | null }>()
  return results.map(orgSummary)
}

export async function createOrg(
  db: D1Database,
  id: string,
  name: string,
  creatorId: string,
  now: number,
): Promise<Org> {
  await db.batch([
    db
      .prepare(
        'INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(id, name, creatorId, now),
    db
      .prepare(
        "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)",
      )
      .bind(id, creatorId, now),
    db
      .prepare('INSERT INTO settings (org_id, updated_at) VALUES (?, ?)')
      .bind(id, now),
  ])
  return { id, name, role: 'admin' }
}

function orgSummary(row: Org & { suspendedAt: number | null }): OrgSummary {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    ...(row.suspendedAt !== null
      ? { suspension: { suspendedAt: row.suspendedAt } }
      : {}),
  }
}
