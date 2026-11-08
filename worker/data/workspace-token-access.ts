import { activeWorkspaceOwnerPredicate } from './sandbox-access'

export const workspaceTokenResourcePredicate = `w.archived_at IS NULL
  AND EXISTS (SELECT 1 FROM orgs token_org
    WHERE token_org.id = w.org_id AND token_org.deleted_at IS NULL)
  AND ${activeWorkspaceOwnerPredicate}`

export const workspaceTokenAccessPredicate = `t.revoked_at IS NULL
  AND ${workspaceTokenResourcePredicate}`

export async function runnerTokenAllowed(
  db: D1Database,
  workspaceId: string,
  tokenHash: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT w.id FROM workspaces w
       JOIN workspace_tokens t ON t.workspace_id = w.id
       WHERE w.id = ? AND t.token_hash = ? AND ${workspaceTokenAccessPredicate}`,
    )
    .bind(workspaceId, tokenHash)
    .first<{ id: string }>()
  return row !== null
}
