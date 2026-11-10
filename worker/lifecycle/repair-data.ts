import { activeAdminMemberPredicate } from '../data/active-admin'
import { activeOrgPredicate } from '../data/org-access'
import { workspaceTokenResourcePredicate } from '../data/workspace-token-access'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'

export const REPAIR_GRACE_MS = 15 * 60 * 1_000
export const REPAIR_LIMIT = 50
export type RepairKind = 'workspace' | 'org'

const workspaceEligible = `w.sandbox_id IS NOT NULL
  AND w.state IN ('stopped', 'error') AND ${workspaceTokenResourcePredicate}`
const orgEligible = `o.deleted_at IS NULL AND ${activeOrgPredicate('o')}
  AND EXISTS (SELECT 1 FROM org_members m WHERE m.org_id = o.id
    AND ${activeAdminMemberPredicate('m')})`

export async function overdueLifecycleRepairs(db: D1Database, cutoff: number) {
  const [workspaces, orgs] = await db.batch<{ id: string }>([
    db
      .prepare(
        `SELECT w.id FROM workspaces w WHERE ${workspaceEligible}
         AND w.next_disk_keepalive_at <= ?
         ORDER BY w.next_disk_keepalive_at, w.id LIMIT ?`,
      )
      .bind(cutoff, REPAIR_LIMIT + 1),
    db
      .prepare(
        `SELECT o.id FROM org_images i JOIN orgs o ON o.id = i.org_id
         WHERE i.provider_account = ? AND i.image_name IS NOT NULL AND ${orgEligible}
         AND i.next_image_refresh_at <= ?
         ORDER BY i.next_image_refresh_at, o.id LIMIT ?`,
      )
      .bind(DEFAULT_PROVIDER_ACCOUNT, cutoff, REPAIR_LIMIT + 1),
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
           WHERE w.id = ? AND ${workspaceEligible} AND w.next_disk_keepalive_at <= ?`,
        )
      : db.prepare(
          `UPDATE org_images SET next_image_refresh_at = ?
           WHERE org_id = ? AND provider_account = ? AND image_name IS NOT NULL
           AND next_image_refresh_at <= ? AND EXISTS (
             SELECT 1 FROM orgs o WHERE o.id = org_images.org_id AND ${orgEligible})`,
        )
  return kind === 'workspace'
    ? statement.bind(now, id, cutoff)
    : statement.bind(now, id, DEFAULT_PROVIDER_ACCOUNT, cutoff)
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
