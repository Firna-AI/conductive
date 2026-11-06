import { lifecycleWritePredicate } from './lifecycle-data'

/** The caller holds a cleanup lease and has removed all provider and Durable Object resources. */
export async function purgeOrgRecords(
  db: D1Database,
  orgId: string,
  leaseToken: string,
) {
  const guard = `EXISTS (SELECT 1 FROM org_deletions WHERE org_id = ? AND lease_token = ? AND purge_started_at IS NOT NULL)`
  const mutations = [
    'DELETE FROM settings WHERE org_id = ?',
    'DELETE FROM image_builds WHERE org_id = ?',
    'UPDATE workspaces SET created_by_workspace_id = NULL WHERE org_id = ?',
    'DELETE FROM workspaces WHERE org_id = ?',
    'DELETE FROM repositories WHERE org_id = ?',
    'DELETE FROM sections WHERE org_id = ?',
    'DELETE FROM org_invites WHERE org_id = ?',
    'DELETE FROM org_members WHERE org_id = ?',
    'DELETE FROM boat_keys WHERE org_id = ?',
    'DELETE FROM orgs WHERE id = ?',
  ]
  const results = await db.batch(
    mutations.map((sql) =>
      db
        .prepare(
          `${sql} AND ${guard}${sql.startsWith('DELETE FROM orgs ') ? ' RETURNING id' : ''}`,
        )
        .bind(orgId, orgId, leaseToken),
    ),
  )
  return results.at(-1)?.results.length === 1
}

export async function pendingWorkspaceStates(db: D1Database, orgId: string) {
  return (
    await db
      .prepare(
        'SELECT workspace_id AS id FROM org_deletion_workspaces WHERE org_id = ? AND state_deleted_at IS NULL ORDER BY workspace_id',
      )
      .bind(orgId)
      .all<{ id: string }>()
  ).results
}

export async function markWorkspaceStateDeleted(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  token: string,
  generation: number,
  now: number,
) {
  const result = await db
    .prepare(
      `UPDATE org_deletion_workspaces SET state_deleted_at = ? WHERE org_id = ? AND workspace_id = ? AND ${lifecycleWritePredicate}`,
    )
    .bind(now, orgId, workspaceId, orgId, token, now, generation)
    .run()
  return result.meta.changes > 0
}
