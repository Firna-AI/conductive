import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { activeAdminPredicate } from './org-data'
import { CLEANUP_LEASE_MS, lifecycleWritePredicate } from './lifecycle-data'

const RESTORE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export function authorizedCleanup(
  db: D1Database,
  orgId: string,
  token: string,
) {
  return db
    .prepare(
      `SELECT d.org_id FROM org_deletions d JOIN orgs o ON o.id = d.org_id
     WHERE d.org_id = ? AND d.lease_token = ? AND o.deleted_at IS NOT NULL`,
    )
    .bind(orgId, token)
    .first<{ org_id: string }>()
}

export async function markOrgDeleted(
  db: D1Database,
  orgId: string,
  actorId: string,
  now: number,
) {
  const result = await db.batch([
    db
      .prepare(
        `UPDATE orgs SET deleted_at = ?, purge_after = ? WHERE id = ? AND deleted_at IS NULL
       AND ${activeAdminPredicate}`,
      )
      .bind(now, now + RESTORE_WINDOW_MS, orgId, orgId, actorId),
    db
      .prepare(
        `INSERT OR IGNORE INTO org_deletions (org_id)
       SELECT id FROM orgs WHERE id = ? AND deleted_at IS NOT NULL`,
      )
      .bind(orgId),
    db
      .prepare(
        `UPDATE preview_hostnames SET revoked_at = COALESCE(revoked_at, ?)
       WHERE org_id = ? AND EXISTS (SELECT 1 FROM orgs WHERE id = ? AND deleted_at IS NOT NULL)`,
      )
      .bind(now, orgId, orgId),
  ])
  return result[0].meta.changes > 0
}

export function deletedOrgs(db: D1Database) {
  return db
    .prepare(
      'SELECT id, purge_after AS deletesAt FROM orgs WHERE deleted_at IS NOT NULL ORDER BY purge_after, id',
    )
    .all<{ id: string; deletesAt: number }>()
}

export function acquireCleanupLease(
  db: D1Database,
  orgId: string,
  token: string,
  now: number,
) {
  return db
    .prepare(
      `UPDATE org_deletions SET lease_token = ?, lease_until = ?
     WHERE org_id = ? AND (lease_token IS NULL OR lease_until <= ?)
     RETURNING suspended_at AS suspendedAt, purge_started_at AS purgeStartedAt`,
    )
    .bind(token, now + CLEANUP_LEASE_MS, orgId, now)
    .first<{ suspendedAt: number | null; purgeStartedAt: number | null }>()
}

export async function renewCleanupLease(
  db: D1Database,
  orgId: string,
  token: string,
  now: number,
) {
  const result = await db
    .prepare(
      'UPDATE org_deletions SET lease_until = ? WHERE org_id = ? AND lease_token = ? AND lease_until > ?',
    )
    .bind(now + CLEANUP_LEASE_MS, orgId, token, now)
    .run()
  return result.meta.changes > 0
}

export async function releaseCleanupLease(
  db: D1Database,
  orgId: string,
  token: string,
) {
  await db
    .prepare(
      'UPDATE org_deletions SET lease_token = NULL, lease_until = NULL WHERE org_id = ? AND lease_token = ?',
    )
    .bind(orgId, token)
    .run()
}

export async function orgWorkspaceIds(db: D1Database, orgId: string) {
  return (
    await db
      .prepare('SELECT id FROM workspaces WHERE org_id = ? ORDER BY id')
      .bind(orgId)
      .all<{ id: string }>()
  ).results.map((row) => row.id)
}

export async function recordSuspendedResources(
  db: D1Database,
  orgId: string,
  token: string,
  generation: number,
  now: number,
) {
  const ownership = [orgId, token, now, generation]
  const result = await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO org_deletion_workspaces (org_id, workspace_id) SELECT org_id, id
         FROM workspaces WHERE org_id = ? AND ${lifecycleWritePredicate}`,
      )
      .bind(orgId, ...ownership),
    db
      .prepare(
        `INSERT OR IGNORE INTO org_deletion_resources (org_id, kind, resource_id, provider_account, sort_order)
       SELECT org_id, 'sandbox', sandbox_id, provider_account, 0 FROM workspaces
         WHERE org_id = ? AND sandbox_id IS NOT NULL AND ${lifecycleWritePredicate}
       UNION ALL SELECT org_id, 'sandbox', sandbox_id, provider_account, 1 FROM image_builds
         WHERE org_id = ? AND sandbox_id IS NOT NULL AND ${lifecycleWritePredicate}
       UNION ALL SELECT org_id, 'sandbox', sandbox_id, provider_account, 0 FROM lifecycle_sandbox_cleanup
         WHERE org_id = ? AND ${lifecycleWritePredicate}`,
      )
      .bind(orgId, ...ownership, orgId, ...ownership, orgId, ...ownership),
    db
      .prepare(
        `INSERT OR IGNORE INTO org_deletion_resources (org_id, kind, resource_id, provider_account)
       SELECT s.org_id, 'snapshot', s.org_image_name, COALESCE(b.provider_account, ?)
         FROM settings s LEFT JOIN image_builds b ON b.id = s.image_build_id AND b.org_id = s.org_id
           AND b.snapshot_name = s.org_image_name
         WHERE s.org_id = ? AND s.org_image_name IS NOT NULL AND ${lifecycleWritePredicate}
       UNION ALL SELECT org_id, 'snapshot', snapshot_name, provider_account FROM image_builds
         WHERE org_id = ? AND snapshot_name IS NOT NULL AND ${lifecycleWritePredicate}`,
      )
      .bind(DEFAULT_PROVIDER_ACCOUNT, orgId, ...ownership, orgId, ...ownership),
    db
      .prepare(
        `UPDATE org_deletions SET suspended_at = ? WHERE org_id = ? AND ${lifecycleWritePredicate}`,
      )
      .bind(now, orgId, ...ownership),
  ])
  return result[3].meta.changes > 0
}

export interface CleanupResource {
  kind: 'sandbox' | 'snapshot'
  id: string
  providerAccount: string
  stoppedAt: number | null
  removedAt: number | null
}

export async function cleanupResources(db: D1Database, orgId: string) {
  return (
    await db
      .prepare(
        `SELECT kind, resource_id AS id, provider_account AS providerAccount,
       stopped_at AS stoppedAt, removed_at AS removedAt
     FROM org_deletion_resources WHERE org_id = ? ORDER BY kind DESC, sort_order, provider_account, resource_id`,
      )
      .bind(orgId)
      .all<CleanupResource>()
  ).results
}

export async function markResourceStopped(
  db: D1Database,
  orgId: string,
  id: string,
  providerAccount: string,
  now: number,
  ownership?: { token: string; generation: number },
) {
  const guard = ownership ? ` AND ${lifecycleWritePredicate}` : ''
  const bindings = ownership
    ? [orgId, ownership.token, now, ownership.generation]
    : []
  const result = await db.batch([
    db
      .prepare(
        `UPDATE org_deletion_resources SET stopped_at = ? WHERE org_id = ?
         AND kind = 'sandbox' AND resource_id = ? AND provider_account = ?${guard}`,
      )
      .bind(now, orgId, id, providerAccount, ...bindings),
    db
      .prepare(
        `UPDATE workspaces SET state = CASE WHEN archived_at IS NULL THEN 'stopped' ELSE state END,
       stopped_at = CASE WHEN state = 'stopped' AND stopped_at IS NOT NULL THEN stopped_at ELSE ? END,
       next_disk_keepalive_at = CASE WHEN state = 'stopped' THEN next_disk_keepalive_at ELSE NULL END,
       updated_at = ? WHERE org_id = ? AND sandbox_id = ? AND provider_account = ?${guard}`,
      )
      .bind(now, now, orgId, id, providerAccount, ...bindings),
    db
      .prepare(
        `UPDATE image_builds SET state = 'failed', completed_at = ?, error = 'The org was deleted.'
       WHERE org_id = ? AND sandbox_id = ? AND provider_account = ? AND state = 'running'${guard}`,
      )
      .bind(now, orgId, id, providerAccount, ...bindings),
  ])
  return result[0].meta.changes > 0
}

export async function markResourceRemoved(
  db: D1Database,
  orgId: string,
  resource: CleanupResource,
  now: number,
) {
  await db
    .prepare(
      `UPDATE org_deletion_resources SET removed_at = ?
       WHERE org_id = ? AND kind = ? AND resource_id = ? AND provider_account = ?`,
    )
    .bind(now, orgId, resource.kind, resource.id, resource.providerAccount)
    .run()
}

export async function markPurgeStarted(
  db: D1Database,
  orgId: string,
  token: string,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE org_deletions SET purge_started_at = COALESCE(purge_started_at, ?)
     WHERE org_id = ? AND lease_token = ?
     AND EXISTS (SELECT 1 FROM orgs WHERE id = ? AND deleted_at IS NOT NULL AND purge_after <= ?)`,
    )
    .bind(now, orgId, token, orgId, now)
    .run()
  return result.meta.changes > 0
}
