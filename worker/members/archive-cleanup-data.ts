import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'

export interface ExpiredArchive {
  workspaceId: string
  sandboxId: string
  providerAccount: string
  archivedAt: number
}

export async function expiredOrgArchives(
  db: D1Database,
  orgId: string,
  now: number,
) {
  return (
    await db
      .prepare(
        `SELECT w.id AS workspaceId, w.sandbox_id AS sandboxId,
    w.provider_account AS providerAccount, w.archived_at AS archivedAt FROM workspaces w
    JOIN org_deletion_resources r ON r.org_id = w.org_id AND r.kind = 'sandbox'
    AND r.resource_id = w.sandbox_id AND r.provider_account = w.provider_account
    WHERE w.org_id = ? AND w.archived_at + ? <= ? AND r.removed_at IS NULL`,
      )
      .bind(orgId, WORKSPACE_RESTORE_MS, now)
      .all<ExpiredArchive>()
  ).results
}

export async function clearExpiredOrgDisk(
  db: D1Database,
  orgId: string,
  token: string,
  row: ExpiredArchive,
  now: number,
) {
  const guard = `EXISTS (SELECT 1 FROM org_deletions d JOIN orgs o ON o.id = d.org_id
    WHERE d.org_id = ? AND d.lease_token = ? AND d.lease_until > ? AND o.deleted_at IS NOT NULL)`
  const result = await db.batch([
    db
      .prepare(
        `UPDATE workspaces SET sandbox_id = NULL, next_disk_keepalive_at = NULL,
    updated_at = MAX(updated_at + 1, ?) WHERE id = ? AND org_id = ?
    AND sandbox_id = ? AND provider_account = ? AND archived_at = ? AND ${guard}`,
      )
      .bind(
        now,
        row.workspaceId,
        orgId,
        row.sandboxId,
        row.providerAccount,
        row.archivedAt,
        orgId,
        token,
        now,
      ),
    db
      .prepare(
        `UPDATE org_deletion_resources SET removed_at = ? WHERE org_id = ?
      AND resource_id = ? AND provider_account = ? AND kind = 'sandbox' AND ${guard}`,
      )
      .bind(now, orgId, row.sandboxId, row.providerAccount, orgId, token, now),
  ])
  return result[0].meta.changes === 1
}
