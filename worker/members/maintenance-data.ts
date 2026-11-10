import { activeWorkspaceOwnerPredicate } from '../data/sandbox-access'
import type { WorkspaceDisk } from './maintenance-contract'
import { lifecycleWritePredicate } from './lifecycle-data'
import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'

export async function deletedOrgDates(db: D1Database, orgId: string) {
  return db
    .prepare(
      'SELECT deleted_at AS deletedAt, purge_after AS deletesAt FROM orgs WHERE id = ? AND deleted_at IS NOT NULL',
    )
    .bind(orgId)
    .first<{ deletedAt: number; deletesAt: number }>()
}

export async function workspaceDisks(
  db: D1Database,
  orgId: string,
  now: number,
): Promise<WorkspaceDisk[]> {
  return (
    await db
      .prepare(
        `SELECT w.id AS workspaceId, w.sandbox_id AS sandboxId,
     w.provider_account AS providerAccount, w.stopped_at AS stoppedAt,
     w.next_disk_keepalive_at AS nextKeepaliveAt, w.archived_at AS archivedAt FROM workspaces w
     JOIN org_deletion_resources r ON r.org_id = w.org_id AND r.kind = 'sandbox' AND r.resource_id = w.sandbox_id
       AND r.provider_account = w.provider_account
     WHERE w.org_id = ? AND ((w.archived_at IS NULL AND w.state = 'stopped')
       OR (w.archived_at IS NOT NULL AND w.state = 'archived' AND w.archived_at + ? > ?))
     AND w.stopped_at IS NOT NULL AND r.removed_at IS NULL AND ${activeWorkspaceOwnerPredicate} ORDER BY w.id`,
      )
      .bind(orgId, WORKSPACE_RESTORE_MS, now)
      .all<Omit<WorkspaceDisk, 'archivedAt'> & { archivedAt: number | null }>()
  ).results.map(({ archivedAt, ...row }) =>
    archivedAt === null ? row : { ...row, archivedAt },
  )
}

export async function scheduleDisk(
  db: D1Database,
  orgId: string,
  token: string,
  workspaceId: string,
  sandboxId: string,
  providerAccount: string,
  nextKeepaliveAt: number,
  generation: number,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE workspaces SET next_disk_keepalive_at = ? WHERE org_id = ? AND id = ?
     AND sandbox_id = ? AND provider_account = ?
     AND state IN ('stopped', 'archived') AND stopped_at < ?
     AND (next_disk_keepalive_at IS NULL OR next_disk_keepalive_at = ?)
     AND EXISTS (SELECT 1 FROM org_deletions WHERE org_id = ? AND purge_started_at IS NULL)
     AND ${lifecycleWritePredicate}`,
    )
    .bind(
      nextKeepaliveAt,
      orgId,
      workspaceId,
      sandboxId,
      providerAccount,
      nextKeepaliveAt,
      nextKeepaliveAt,
      orgId,
      orgId,
      token,
      now,
      generation,
    )
    .run()
  return result.meta.changes > 0
}

export async function beginDiskRestart(
  db: D1Database,
  orgId: string,
  token: string,
  sandboxId: string,
  providerAccount: string,
  generation: number,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE org_deletion_resources SET stopped_at = NULL WHERE org_id = ? AND resource_id = ?
     AND provider_account = ? AND kind = 'sandbox'
     AND ${lifecycleWritePredicate}`,
    )
    .bind(orgId, sandboxId, providerAccount, orgId, token, now, generation)
    .run()
  return result.meta.changes > 0
}

export async function markDiskResumed(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  sandboxId: string,
  providerAccount: string,
  token: string,
  generation: number,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE workspaces SET state = CASE WHEN archived_at IS NULL THEN 'starting' ELSE state END,
       stopped_at = NULL WHERE org_id = ? AND id = ?
       AND sandbox_id = ? AND provider_account = ? AND ${lifecycleWritePredicate}`,
    )
    .bind(
      orgId,
      workspaceId,
      sandboxId,
      providerAccount,
      orgId,
      token,
      now,
      generation,
    )
    .run()
  return result.meta.changes > 0
}
