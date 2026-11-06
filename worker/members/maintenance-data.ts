import type { WorkspaceDisk } from './maintenance-contract'

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
): Promise<WorkspaceDisk[]> {
  return (
    await db
      .prepare(
        `SELECT w.id AS workspaceId, w.sandbox_id AS sandboxId, w.stopped_at AS stoppedAt,
     w.next_disk_keepalive_at AS nextKeepaliveAt FROM workspaces w
     JOIN org_deletion_resources r ON r.org_id = w.org_id AND r.kind = 'sandbox' AND r.resource_id = w.sandbox_id
     WHERE w.org_id = ? AND w.archived_at IS NULL AND w.state = 'stopped'
     AND w.stopped_at IS NOT NULL AND r.removed_at IS NULL ORDER BY w.id`,
      )
      .bind(orgId)
      .all<WorkspaceDisk>()
  ).results
}

export async function scheduleDisk(
  db: D1Database,
  orgId: string,
  token: string,
  workspaceId: string,
  nextKeepaliveAt: number,
) {
  const result = await db
    .prepare(
      `UPDATE workspaces SET next_disk_keepalive_at = ? WHERE org_id = ? AND id = ? AND archived_at IS NULL
     AND state = 'stopped' AND stopped_at < ?
     AND (next_disk_keepalive_at IS NULL OR next_disk_keepalive_at = ?)
     AND EXISTS (SELECT 1 FROM org_deletions WHERE org_id = ? AND lease_token = ? AND purge_started_at IS NULL)`,
    )
    .bind(
      nextKeepaliveAt,
      orgId,
      workspaceId,
      nextKeepaliveAt,
      nextKeepaliveAt,
      orgId,
      token,
    )
    .run()
  return result.meta.changes > 0
}

export async function beginDiskRestart(
  db: D1Database,
  orgId: string,
  token: string,
  sandboxId: string,
) {
  await db
    .prepare(
      `UPDATE org_deletion_resources SET stopped_at = NULL WHERE org_id = ? AND resource_id = ? AND kind = 'sandbox'
     AND EXISTS (SELECT 1 FROM org_deletions WHERE org_id = ? AND lease_token = ?)`,
    )
    .bind(orgId, sandboxId, orgId, token)
    .run()
}

export async function markDiskResumed(
  db: D1Database,
  orgId: string,
  workspaceId: string,
) {
  await db
    .prepare(
      "UPDATE workspaces SET state = 'starting' WHERE org_id = ? AND id = ?",
    )
    .bind(orgId, workspaceId)
    .run()
}
