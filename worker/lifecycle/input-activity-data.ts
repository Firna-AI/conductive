import { sandboxAccessPredicate } from '../data/sandbox-access'

export function readInputActivityTarget(db: D1Database, workspaceId: string) {
  return db
    .prepare(
      `SELECT w.org_id AS orgId, w.sandbox_id AS sandboxId, w.provider_account AS providerAccount,
       (SELECT lifecycle_generation FROM orgs WHERE id = w.org_id) AS generation FROM workspaces w
       WHERE w.id = ? AND ${sandboxAccessPredicate}`,
    )
    .bind(workspaceId)
    .first<{
      orgId: string
      sandboxId: string
      providerAccount: string
      generation: number
    }>()
}

export async function writeWorkspaceActivity(
  db: D1Database,
  workspaceId: string,
  now: number,
  sandboxId: string,
  generation: number,
  providerAccount: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE workspaces AS w SET last_activity_at = MAX(COALESCE(last_activity_at, 0), ?)
     WHERE id = ? AND sandbox_id = ? AND provider_account = ? AND ${sandboxAccessPredicate}
     AND EXISTS (SELECT 1 FROM orgs o WHERE o.id = w.org_id AND o.lifecycle_generation = ?)`,
    )
    .bind(now, workspaceId, sandboxId, providerAccount, generation)
    .run()
  return result.meta.changes > 0
}
