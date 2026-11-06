import type { Preview } from '../../src/shared/previews'
import type { WorkspaceTarget } from './types'
import type { PortMode } from './provider'

export interface PreviewRecord extends WorkspaceTarget {
  id: string
  hostname: string
  port: number
  expiresAt: number
  listenerMode?: PortMode | null
  listenerSandboxId?: string | null
}

export function publicPreview(row: PreviewRecord): Preview {
  return {
    id: row.id,
    port: row.port,
    url: `https://${row.hostname}`,
    expiresAt: row.expiresAt,
  }
}

export async function insertPreview(
  db: D1Database,
  target: WorkspaceTarget,
  row: PreviewRecord,
  userId: string,
  now: number,
): Promise<boolean> {
  const result = await db
    .prepare(
      `INSERT INTO preview_hostnames (id, hostname, org_id, workspace_id, port, created_at, expires_at, listener_mode, listener_sandbox_id)
     SELECT ?, ?, w.org_id, w.id, ?, ?, ?, ?, w.sandbox_id FROM workspaces w
     JOIN orgs o ON o.id = w.org_id JOIN org_members m ON m.org_id = o.id
     WHERE w.id = ? AND w.org_id = ? AND w.sandbox_id = ? AND w.archived_at IS NULL
     AND w.state IN ('ready', 'working', 'unread') AND o.deleted_at IS NULL AND m.user_id = ?`,
    )
    .bind(
      row.id,
      row.hostname,
      row.port,
      now,
      row.expiresAt,
      row.listenerMode ?? null,
      target.workspaceId,
      target.orgId,
      target.sandboxId,
      userId,
    )
    .run()
  return result.meta.changes === 1
}

export async function listPreviews(
  db: D1Database,
  target: WorkspaceTarget,
  now: number,
): Promise<Preview[]> {
  const { results } = await db
    .prepare(
      `SELECT id, hostname, port, expires_at AS expiresAt FROM preview_hostnames
     WHERE org_id = ? AND workspace_id = ? AND revoked_at IS NULL AND expires_at > ?
     ORDER BY created_at, id`,
    )
    .bind(target.orgId, target.workspaceId, now)
    .all<PreviewRecord>()
  return results.map(publicPreview)
}

export function activePreview(
  db: D1Database,
  hostname: string,
  now: number,
): Promise<PreviewRecord | null> {
  return db
    .prepare(
      `SELECT p.id, p.hostname, p.org_id AS orgId, p.workspace_id AS workspaceId,
     p.port, p.expires_at AS expiresAt, p.listener_mode AS listenerMode,
     p.listener_sandbox_id AS listenerSandboxId, w.sandbox_id AS sandboxId, w.state
     FROM preview_hostnames p JOIN workspaces w ON w.id = p.workspace_id AND w.org_id = p.org_id
     JOIN orgs o ON o.id = p.org_id
     WHERE p.hostname = ? AND p.revoked_at IS NULL AND p.expires_at > ?
     AND w.archived_at IS NULL AND w.sandbox_id IS NOT NULL
     AND w.state IN ('ready', 'working', 'unread') AND o.deleted_at IS NULL`,
    )
    .bind(hostname, now)
    .first<PreviewRecord>()
}

export async function savePreviewMode(
  db: D1Database,
  target: WorkspaceTarget,
  port: number,
  mode: PortMode,
): Promise<void> {
  await db
    .prepare(
      `UPDATE preview_hostnames SET listener_mode = ?, listener_sandbox_id = ? WHERE workspace_id = ? AND org_id = ? AND port = ?
     AND revoked_at IS NULL AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_id AND w.sandbox_id = ?)`,
    )
    .bind(
      mode,
      target.sandboxId,
      target.workspaceId,
      target.orgId,
      port,
      target.sandboxId,
    )
    .run()
}

export async function revokePreview(
  db: D1Database,
  target: WorkspaceTarget,
  id: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE preview_hostnames SET revoked_at = COALESCE(revoked_at, ?)
     WHERE org_id = ? AND workspace_id = ? AND id = ?`,
    )
    .bind(now, target.orgId, target.workspaceId, id)
    .run()
}

export async function revokeWorkspacePreviews(
  db: D1Database,
  workspaceId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      'UPDATE preview_hostnames SET revoked_at = COALESCE(revoked_at, ?) WHERE workspace_id = ?',
    )
    .bind(now, workspaceId)
    .run()
}

export async function expirePreviews(
  db: D1Database,
  now: number,
): Promise<void> {
  await db
    .prepare(
      'UPDATE preview_hostnames SET revoked_at = ? WHERE revoked_at IS NULL AND expires_at <= ?',
    )
    .bind(now, now)
    .run()
}

export function previewExpiry(
  db: D1Database,
  workspaceId: string,
): Promise<number | null> {
  return db
    .prepare(
      'SELECT MIN(expires_at) AS expiresAt FROM preview_hostnames WHERE workspace_id = ? AND revoked_at IS NULL',
    )
    .bind(workspaceId)
    .first<number>('expiresAt')
}
