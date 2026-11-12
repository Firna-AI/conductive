import { activeOrgPredicate } from '../data/org-access'
import type { Org } from '../../src/shared/api'
import type { MoveOrgRequest, OrgSummary } from '../../src/shared/orgs'
import { activeAdminMemberPredicate } from '../data/active-admin'

interface OrgRow extends Org {
  initials: string | null
  deletedAt: number | null
  deletesAt: number | null
  suspendedAt: number | null
}

function summary(row: OrgRow): OrgSummary {
  const org: OrgSummary = { id: row.id, name: row.name, role: row.role }
  if (row.initials !== null) org.initials = row.initials
  if (row.deletedAt !== null && row.deletesAt !== null) {
    org.deletion = { deletedAt: row.deletedAt, deletesAt: row.deletesAt }
  }
  if (row.suspendedAt !== null)
    org.suspension = { suspendedAt: row.suspendedAt }
  return org
}

export async function visibleOrg(
  db: D1Database,
  orgId: string,
  userId: string,
) {
  const row = await db
    .prepare(
      `SELECT o.id, o.name, o.initials, m.role, o.deleted_at AS deletedAt, o.purge_after AS deletesAt, o.suspended_at AS suspendedAt
     FROM orgs o JOIN org_members m ON m.org_id = o.id
     WHERE o.id = ? AND m.user_id = ? AND (o.deleted_at IS NULL OR m.role = 'admin')`,
    )
    .bind(orgId, userId)
    .first<OrgRow>()
  return row ? summary(row) : null
}

export async function visibleOrgs(
  db: D1Database,
  userId: string,
): Promise<OrgSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT o.id, o.name, o.initials, m.role, o.deleted_at AS deletedAt, o.purge_after AS deletesAt, o.suspended_at AS suspendedAt
     FROM orgs o JOIN org_members m ON m.org_id = o.id
     WHERE m.user_id = ? AND (o.deleted_at IS NULL OR m.role = 'admin')
     ORDER BY m.rail_position IS NULL, m.rail_position, m.joined_at, o.id`,
    )
    .bind(userId)
    .all<OrgRow>()
  return results.map(summary)
}

export async function moveOrg(
  db: D1Database,
  userId: string,
  { orgId, index }: MoveOrgRequest,
): Promise<boolean> {
  const result = await db
    .prepare(
      `WITH visible AS MATERIALIZED (
         SELECT o.id, m.rail_position, m.joined_at
         FROM org_members m JOIN orgs o ON o.id = m.org_id
         WHERE m.user_id = ? AND (o.deleted_at IS NULL OR m.role = 'admin')
       ), siblings AS MATERIALIZED (
         SELECT id, ROW_NUMBER() OVER (
           ORDER BY rail_position IS NULL, rail_position, joined_at, id
         ) - 1 AS rank FROM visible WHERE id != ?
       ), destination AS MATERIALIZED (
         SELECT MIN(?, COUNT(*)) AS position FROM siblings
       ), ranks AS MATERIALIZED (
         SELECT siblings.id, rank + CASE WHEN rank >= destination.position THEN 1 ELSE 0 END AS position
         FROM siblings CROSS JOIN destination
         UNION ALL SELECT ?, position FROM destination
       ) UPDATE org_members SET rail_position = (
         SELECT ranks.position FROM ranks WHERE ranks.id = org_members.org_id
       ) WHERE user_id = ? AND org_id IN (SELECT id FROM ranks)
         AND EXISTS (SELECT 1 FROM visible WHERE id = ?)`,
    )
    .bind(
      userId,
      orgId,
      Math.min(index, Number.MAX_SAFE_INTEGER),
      orgId,
      userId,
      orgId,
    )
    .run()
  return result.meta.changes > 0
}

export async function renameOrg(
  db: D1Database,
  orgId: string,
  userId: string,
  name: string,
  initials?: string,
) {
  return db
    .prepare(
      `UPDATE orgs SET name = ?, initials = COALESCE(?, initials) WHERE id = ? AND deleted_at IS NULL
     AND ${activeAdminPredicate}
     RETURNING id`,
    )
    .bind(name, initials ?? null, orgId, orgId, userId)
    .first<{ id: string }>()
}

/** Append this predicate to the settings owner's writes in the same D1 transaction. */
export const activeAdminPredicate = `EXISTS (
  SELECT 1 FROM orgs access_org JOIN org_members access_member ON access_member.org_id = access_org.id
  WHERE access_org.id = ? AND access_member.user_id = ?
  AND ${activeAdminMemberPredicate('access_member')} AND access_org.deleted_at IS NULL
  AND ${activeOrgPredicate('access_org')}
)`
