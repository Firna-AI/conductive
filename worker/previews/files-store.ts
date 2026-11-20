import { sandboxAccessPredicate } from '../data/sandbox-access'
import type { PreviewRecord } from './store'
import type { WorkspaceTarget } from './types'

export async function activeFilesPreview(
  db: D1Database,
  target: WorkspaceTarget,
  userId: string,
  now: number,
): Promise<PreviewRecord | null> {
  const row = await db
    .prepare(
      `SELECT p.id, p.hostname, p.port, p.expires_at AS expiresAt FROM preview_hostnames p
     JOIN workspaces w ON w.id = p.workspace_id AND w.org_id = p.org_id
     JOIN org_members m ON m.org_id = w.org_id AND m.user_id = ?
     WHERE p.org_id = ? AND p.workspace_id = ? AND p.port = 0
     AND p.revoked_at IS NULL AND p.expires_at > ?
     AND w.sandbox_id = ? AND w.provider_account = ? AND ${sandboxAccessPredicate}
     ORDER BY p.created_at, p.id LIMIT 1`,
    )
    .bind(
      userId,
      target.orgId,
      target.workspaceId,
      now,
      target.sandboxId,
      target.providerAccount,
    )
    .first<PreviewRecord>()
  return row ? { ...target, ...row } : null
}
