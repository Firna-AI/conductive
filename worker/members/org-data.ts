import { activeOrgPredicate } from '../data/org-access'
import type { Org } from '../../src/shared/api'
import type { OrgSummary } from '../../src/shared/orgs'
import { activeAdminMemberPredicate } from '../data/active-admin'

interface OrgRow extends Org {
  deletedAt: number | null
  deletesAt: number | null
  suspendedAt: number | null
}

function summary(row: OrgRow): OrgSummary {
  const org: OrgSummary = { id: row.id, name: row.name, role: row.role }
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
      `SELECT o.id, o.name, m.role, o.deleted_at AS deletedAt, o.purge_after AS deletesAt, o.suspended_at AS suspendedAt
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
      `SELECT o.id, o.name, m.role, o.deleted_at AS deletedAt, o.purge_after AS deletesAt, o.suspended_at AS suspendedAt
     FROM orgs o JOIN org_members m ON m.org_id = o.id
     WHERE m.user_id = ? AND (o.deleted_at IS NULL OR m.role = 'admin')
     ORDER BY o.created_at, o.id`,
    )
    .bind(userId)
    .all<OrgRow>()
  return results.map(summary)
}

export async function renameOrg(
  db: D1Database,
  orgId: string,
  userId: string,
  name: string,
) {
  return db
    .prepare(
      `UPDATE orgs SET name = ? WHERE id = ? AND deleted_at IS NULL AND ${activeOrgPredicate('orgs')}
     AND EXISTS (SELECT 1 FROM org_members WHERE org_id = orgs.id AND user_id = ? AND role = 'admin')
     RETURNING id`,
    )
    .bind(name, orgId, userId)
    .first<{ id: string }>()
}

/** Append this predicate to the settings owner's writes in the same D1 transaction. */
export const activeAdminPredicate = `EXISTS (
  SELECT 1 FROM orgs access_org JOIN org_members access_member ON access_member.org_id = access_org.id
  WHERE access_org.id = ? AND access_member.user_id = ?
  AND ${activeAdminMemberPredicate('access_member')} AND access_org.deleted_at IS NULL
  AND ${activeOrgPredicate('access_org')}
)`
