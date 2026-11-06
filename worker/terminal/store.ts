import type { WorkspaceTarget } from '../previews/types'

export function readTerminalCredential(
  db: D1Database,
  workspaceId: string,
  sandboxId: string | null,
): Promise<{ ciphertext: string } | null> {
  return db
    .prepare(
      'SELECT ciphertext FROM terminal_credentials WHERE workspace_id = ? AND sandbox_id = ?',
    )
    .bind(workspaceId, sandboxId)
    .first<{ ciphertext: string }>()
}

export async function saveTerminalCredential(
  db: D1Database,
  target: WorkspaceTarget,
  ciphertext: string,
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO terminal_credentials (workspace_id, ciphertext, updated_at, sandbox_id)
       SELECT w.id, ?, ?, w.sandbox_id FROM workspaces w JOIN orgs o ON o.id = w.org_id
       WHERE w.id = ? AND w.org_id = ? AND w.sandbox_id = ? AND w.archived_at IS NULL AND o.deleted_at IS NULL
       ON CONFLICT (workspace_id) DO UPDATE SET ciphertext = excluded.ciphertext,
       updated_at = excluded.updated_at, sandbox_id = excluded.sandbox_id`,
    )
    .bind(ciphertext, now, target.workspaceId, target.orgId, target.sandboxId)
    .run()
  return result.meta.changes === 1
}
