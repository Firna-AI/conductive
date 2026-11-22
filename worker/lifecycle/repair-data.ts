import { activeAdminMemberPredicate } from '../data/active-admin'
import { activeOrgPredicate } from '../data/org-access'
import { workspaceTokenResourcePredicate } from '../data/workspace-token-access'
import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'

export const REPAIR_GRACE_MS = 15 * 60 * 1_000
export const REPAIR_LIMIT = 50
export type RepairKind = 'workspace' | 'org'

const workspaceEligible = `w.sandbox_id IS NOT NULL AND (
  (w.state IN ('stopped', 'error') AND ${workspaceTokenResourcePredicate})
  OR (w.archived_at IS NOT NULL AND EXISTS (SELECT 1 FROM orgs archive_org
    WHERE archive_org.id = w.org_id AND archive_org.deleted_at IS NULL)))`
const workspaceDue = `COALESCE(w.next_disk_keepalive_at, w.archived_at + ${WORKSPACE_RESTORE_MS})`
const orgEligible = `o.deleted_at IS NULL AND ${activeOrgPredicate('o')}
  AND EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = o.id
    AND ${activeAdminMemberPredicate('m')})`

export async function overdueLifecycleRepairs(db: D1Database, cutoff: number) {
  const [workspaces, orgs] = await db.batch<{
    id: string
    switchPending?: number
  }>([
    db
      .prepare(
        `SELECT w.id FROM workspaces w WHERE ${workspaceEligible}
         AND ${workspaceDue} <= ?
         ORDER BY ${workspaceDue}, w.id LIMIT ?`,
      )
      .bind(cutoff, REPAIR_LIMIT + 1),
    db
      .prepare(
        `SELECT s.org_id AS id, 1 AS switchPending, s.requested_at AS repairAt
         FROM org_provider_switches s JOIN orgs o ON o.id = s.org_id
         WHERE s.state IN ('waiting', 'building') AND ${orgEligible}
         UNION ALL
         SELECT o.id, 0 AS switchPending, i.next_image_refresh_at AS repairAt
         FROM org_images i JOIN orgs o ON o.id = i.org_id
         WHERE i.provider_account = o.provider_account AND i.image_name IS NOT NULL AND ${orgEligible}
         AND i.next_image_refresh_at <= ?
         AND NOT EXISTS (SELECT 1 FROM org_provider_switches s
           WHERE s.org_id = o.id AND s.state IN ('waiting', 'building'))
         ORDER BY repairAt, id LIMIT ?`,
      )
      .bind(cutoff, REPAIR_LIMIT + 1),
  ])
  return { workspaces: workspaces.results, orgs: orgs.results }
}

/** Advance the repair signal while the object keeps its actual alarm deadline. */
function repairDeferral(
  db: D1Database,
  kind: RepairKind,
  id: string,
  now: number,
  cutoff: number,
): D1PreparedStatement {
  const statement =
    kind === 'workspace'
      ? db.prepare(
          `UPDATE workspaces AS w SET next_disk_keepalive_at = ?
           WHERE w.id = ? AND ${workspaceEligible} AND ${workspaceDue} <= ?`,
        )
      : db.prepare(
          `UPDATE org_images SET next_image_refresh_at = ?
           WHERE org_id = ? AND image_name IS NOT NULL
           AND next_image_refresh_at <= ? AND EXISTS (
             SELECT 1 FROM orgs o WHERE o.id = org_images.org_id
             AND o.provider_account = org_images.provider_account AND ${orgEligible})`,
        )
  return statement.bind(now, id, cutoff)
}

export async function deferOverdueRepair(
  db: D1Database,
  kind: RepairKind,
  id: string,
  now: number,
  cutoff: number,
): Promise<boolean> {
  const result = await repairDeferral(db, kind, id, now, cutoff).run()
  return result.meta.changes === 1
}

export async function settleLifecycleRepairs(
  db: D1Database,
  repairs: readonly { kind: RepairKind; id: string }[],
  now: number,
  cutoff: number,
): Promise<void> {
  if (repairs.length)
    await db.batch(
      repairs.map(({ kind, id }) => repairDeferral(db, kind, id, now, cutoff)),
    )
}
