import type { WorkspaceState } from '../../src/shared/workspaces'

export async function persistLifecycleState(
  db: D1Database,
  input: {
    workspaceId: string
    orgId: string
    state: WorkspaceState
    lastActivityAt: number
    stoppedAt: number | null
    nextDiskKeepaliveAt: number | null
    error: { code: string; message: string } | null
  },
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE workspaces SET state = ?, last_activity_at = ?, stopped_at = ?,
     next_disk_keepalive_at = ?, last_error_code = ?, last_error_message = ?, updated_at = MAX(updated_at, ?)
     WHERE id = ? AND org_id = ? AND archived_at IS NULL AND state != 'archived'
       AND EXISTS (SELECT 1 FROM orgs WHERE orgs.id = workspaces.org_id AND orgs.deleted_at IS NULL)`,
    )
    .bind(
      input.state,
      input.lastActivityAt,
      input.stoppedAt,
      input.nextDiskKeepaliveAt,
      input.error?.code ?? null,
      input.error?.message ?? null,
      now,
      input.workspaceId,
      input.orgId,
    )
    .run()
}
