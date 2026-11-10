import { WORKSPACE_RESTORE_MS } from '../../src/shared/workspaces'
import { activeOrgPredicate } from '../data/org-access'
import { DISK_KEEPALIVE_MS } from './durable-types'

export interface ArchiveResource {
  workspaceId: string
  orgId: string
  sandboxId: string | null
  providerAccount: string
  archivedAt: number | null
  stoppedAt: number | null
  updatedAt: number
  orgSuspended: number | null
  ownerSuspended: number | null
  orgDeleted: number | null
}

export function readArchiveResource(db: D1Database, id: string) {
  return db
    .prepare(
      `SELECT w.id AS workspaceId, w.org_id AS orgId, w.sandbox_id AS sandboxId, w.provider_account AS providerAccount,
    w.archived_at AS archivedAt, w.stopped_at AS stoppedAt, w.updated_at AS updatedAt,
    o.suspended_at AS orgSuspended, o.deleted_at AS orgDeleted,
    u.suspended_at AS ownerSuspended FROM workspaces w JOIN orgs o ON o.id = w.org_id
    JOIN users u ON u.id = w.owner_user_id WHERE w.id = ?`,
    )
    .bind(id)
    .first<ArchiveResource>()
}

export async function restoreArchiveRecord(
  db: D1Database,
  row: ArchiveResource,
  userId: string,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE workspaces SET archived_at = NULL, state = 'stopped',
    updated_at = MAX(?, updated_at + 1), last_error_code = NULL, last_error_message = NULL,
    next_disk_keepalive_at = COALESCE(stopped_at + ?, ?)
    WHERE id = ? AND org_id = ? AND archived_at = ? AND sandbox_id = ? AND provider_account = ? AND archived_at + ? > ?
    AND EXISTS (SELECT 1 FROM orgs o JOIN org_members m ON m.org_id = o.id
      JOIN users u ON u.id = m.user_id WHERE o.id = workspaces.org_id
      AND o.deleted_at IS NULL AND ${activeOrgPredicate('o')}
      AND m.user_id = ? AND u.suspended_at IS NULL)`,
    )
    .bind(
      now,
      DISK_KEEPALIVE_MS,
      now,
      row.workspaceId,
      row.orgId,
      row.archivedAt,
      row.sandboxId,
      row.providerAccount,
      WORKSPACE_RESTORE_MS,
      now,
      userId,
    )
    .run()
  return result.meta.changes === 1
}

export async function writeArchiveDisk(
  db: D1Database,
  row: ArchiveResource,
  sandboxId: string | null,
  stoppedAt: number | null,
) {
  const expiry =
    row.archivedAt === null ? null : row.archivedAt + WORKSPACE_RESTORE_MS
  const due =
    sandboxId === null
      ? null
      : stoppedAt === null
        ? row.archivedAt
        : expiry !== null && expiry > stoppedAt + WORKSPACE_RESTORE_MS
          ? stoppedAt + DISK_KEEPALIVE_MS
          : expiry
  await db
    .prepare(
      `UPDATE workspaces SET updated_at = CASE WHEN sandbox_id IS NOT ?
      THEN updated_at + 1 ELSE updated_at END,
      sandbox_id = ?, stopped_at = ?, next_disk_keepalive_at = ?
    WHERE id = ? AND org_id = ? AND archived_at = ? AND provider_account = ?`,
    )
    .bind(
      sandboxId,
      sandboxId,
      stoppedAt,
      due,
      row.workspaceId,
      row.orgId,
      row.archivedAt,
      row.providerAccount,
    )
    .run()
}

export async function detachArchiveDisk(
  db: D1Database,
  row: ArchiveResource,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE workspaces SET sandbox_id = NULL, next_disk_keepalive_at = NULL,
    updated_at = MAX(?, updated_at + 1) WHERE id = ? AND org_id = ?
    AND archived_at = ? AND sandbox_id = ? AND provider_account = ?`,
    )
    .bind(
      now,
      row.workspaceId,
      row.orgId,
      row.archivedAt,
      row.sandboxId,
      row.providerAccount,
    )
    .run()
  return result.meta.changes === 1
}

export async function scheduleArchiveRepair(
  db: D1Database,
  row: ArchiveResource,
  at: number,
) {
  await db
    .prepare(
      `UPDATE workspaces SET next_disk_keepalive_at = ? WHERE id = ?
    AND archived_at = ? AND provider_account = ? AND sandbox_id IS NOT NULL`,
    )
    .bind(at, row.workspaceId, row.archivedAt, row.providerAccount)
    .run()
}
