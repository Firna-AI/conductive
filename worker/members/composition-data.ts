export async function orgLifecycleReceivers(
  db: D1Database,
  orgId: string,
): Promise<string[]> {
  return (
    await db
      .prepare(
        `SELECT id FROM workspaces WHERE org_id = ?
    UNION SELECT workspace_id AS id FROM workspace_creation_attempts WHERE org_id = ?
    UNION SELECT workspace_id AS id FROM lifecycle_sandbox_cleanup WHERE org_id = ?`,
      )
      .bind(orgId, orgId, orgId)
      .all<{ id: string }>()
  ).results.map((row) => row.id)
}

export async function stopOrgLifecycleRecords(
  db: D1Database,
  orgId: string,
  generation: number,
  now: number,
): Promise<void> {
  const owned =
    'EXISTS (SELECT 1 FROM orgs o WHERE o.id = ? AND o.lifecycle_generation = ? AND o.deleted_at IS NOT NULL)'
  await db.batch([
    db
      .prepare(
        `UPDATE workspaces SET state = 'stopped', updated_at = ? WHERE org_id = ?
      AND sandbox_id IS NULL AND archived_at IS NULL AND state != 'archived' AND ${owned}`,
      )
      .bind(now, orgId, orgId, generation),
    db
      .prepare(
        `UPDATE image_build_jobs SET phase = 'done' WHERE build_id IN
      (SELECT id FROM image_builds WHERE org_id = ? AND state = 'running') AND ${owned}`,
      )
      .bind(orgId, orgId, generation),
    db
      .prepare(
        `UPDATE image_builds SET state = 'failed', completed_at = ?, error = ?
      WHERE org_id = ? AND state = 'running' AND ${owned}`,
      )
      .bind(now, 'The org was deleted.', orgId, orgId, generation),
  ])
}

export async function hiddenOrgReceivers(
  db: D1Database,
  orgId: string,
): Promise<string[]> {
  return (
    await db
      .prepare(
        `SELECT workspace_id AS id FROM workspace_creation_attempts a
    WHERE org_id = ? AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = a.workspace_id)
    UNION SELECT workspace_id AS id FROM lifecycle_sandbox_cleanup c WHERE org_id = ?
    AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = c.workspace_id)`,
      )
      .bind(orgId, orgId)
      .all<{ id: string }>()
  ).results.map((row) => row.id)
}
export async function orgLifecycleActive(
  db: D1Database,
  orgId: string,
  generation: number,
): Promise<boolean> {
  return (
    (await db
      .prepare(
        'SELECT id FROM orgs WHERE id = ? AND lifecycle_generation = ? AND deleted_at IS NULL',
      )
      .bind(orgId, generation)
      .first()) !== null
  )
}
