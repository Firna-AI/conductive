import type { WorkspaceTarget } from '../previews/types'

export function readTerminalCredential(
  db: D1Database,
  workspaceId: string,
  sandboxId: string | null,
  providerAccount: string,
): Promise<{ ciphertext: string; providerAccount: string } | null> {
  return db
    .prepare(
      `SELECT ciphertext, provider_account AS providerAccount FROM terminal_credentials
       WHERE workspace_id = ? AND sandbox_id = ? AND provider_account = ?`,
    )
    .bind(workspaceId, sandboxId, providerAccount)
    .first<{ ciphertext: string; providerAccount: string }>()
}

export async function saveTerminalCredential(
  db: D1Database,
  target: WorkspaceTarget,
  ciphertext: string,
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO terminal_credentials (workspace_id, ciphertext, updated_at, sandbox_id, provider_account)
       SELECT w.id, ?, ?, w.sandbox_id, w.provider_account FROM workspaces w JOIN orgs o ON o.id = w.org_id
       WHERE w.id = ? AND w.org_id = ? AND w.sandbox_id = ? AND w.provider_account = ?
       AND w.archived_at IS NULL AND o.deleted_at IS NULL
       ON CONFLICT (workspace_id) DO UPDATE SET ciphertext = excluded.ciphertext,
       updated_at = excluded.updated_at, sandbox_id = excluded.sandbox_id,
       provider_account = excluded.provider_account`,
    )
    .bind(
      ciphertext,
      now,
      target.workspaceId,
      target.orgId,
      target.sandboxId,
      target.providerAccount,
    )
    .run()
  return result.meta.changes === 1
}
