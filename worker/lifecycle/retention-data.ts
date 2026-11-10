import { workspaceTokenResourcePredicate } from '../data/workspace-token-access'

export interface RetentionProgress {
  phase: 'resume' | 'wait' | 'startup' | 'stop'
  error: string | null
}

export function readRetention(
  db: D1Database,
  workspaceId: string,
): Promise<RetentionProgress | null> {
  return db
    .prepare(
      'SELECT phase, error FROM workspace_retention WHERE workspace_id = ?',
    )
    .bind(workspaceId)
    .first<RetentionProgress>()
}

export async function setRetention(
  db: D1Database,
  workspaceId: string,
  phase: RetentionProgress['phase'],
  error: string | null = null,
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO workspace_retention (workspace_id, phase, error) VALUES (?, ?, ?) ON CONFLICT (workspace_id) DO UPDATE SET phase = excluded.phase, error = excluded.error',
    )
    .bind(workspaceId, phase, error)
    .run()
}

export async function clearRetention(
  db: D1Database,
  workspaceId: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM workspace_retention WHERE workspace_id = ?')
    .bind(workspaceId)
    .run()
}
export async function retentionResourceAllowed(
  db: D1Database,
  workspaceId: string,
  sandboxId: string,
  providerAccount: string,
): Promise<boolean> {
  const resource = await db
    .prepare(
      `SELECT w.id FROM workspaces w WHERE w.id = ? AND w.sandbox_id = ? AND w.provider_account = ?
     AND ${workspaceTokenResourcePredicate}`,
    )
    .bind(workspaceId, sandboxId, providerAccount)
    .first()
  return resource !== null
}
