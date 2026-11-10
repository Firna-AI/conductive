import type { ImportScanRow } from '../../src/shared/conductor-import-operation.ts'
import { HttpError } from '../http'

export interface ImportActor {
  orgId: string
  userId: string
  sessionId: string
}

export const importPermission = `EXISTS (
  SELECT 1 FROM orgs o JOIN org_members m ON m.org_id = o.id
  JOIN users u ON u.id = m.user_id JOIN sessions s ON s.user_id = u.id
  JOIN user_app_access a ON a.user_id = u.id
  WHERE o.id = ? AND u.id = ? AND s.id = ? AND s.expires_at > ?
    AND o.deleted_at IS NULL AND o.suspended_at IS NULL AND u.suspended_at IS NULL
)`

export const importAccessBindings = (actor: ImportActor, now: number) => [
  actor.orgId,
  actor.userId,
  actor.sessionId,
  now,
]

export async function requireImportAccess(
  db: D1Database,
  actor: ImportActor,
  now: number,
) {
  const permitted = await db
    .prepare(`SELECT 1 AS allowed WHERE ${importPermission}`)
    .bind(...importAccessBindings(actor, now))
    .first()
  if (!permitted)
    throw new HttpError(403, 'import_forbidden', 'The import is not available.')
}

export function githubRepositoryName(remote: string): string | null {
  const match = remote.match(
    /^(?:(?:https:\/\/github\.com\/)|(?:git@github\.com:)|(?:ssh:\/\/git@github\.com\/))?([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/i,
  )
  return match?.[1]?.toLowerCase() ?? null
}

export async function importRepository(
  db: D1Database,
  actor: ImportActor,
  row: ImportScanRow,
  now: number,
) {
  const fullName =
    row.repository === null ? null : githubRepositoryName(row.repository)
  if (!fullName) return null
  return db
    .prepare(
      `SELECT r.id, r.full_name AS fullName,
      r.github_repository_id AS githubId, r.default_branch AS defaultBranch
    FROM repositories r LEFT JOIN github_installations i ON i.id = r.installation_id
    WHERE r.org_id = ? AND lower(r.full_name) = ? AND r.selected = 1
      AND (r.installation_id IS NULL OR (i.id IS NOT NULL AND i.suspended_at IS NULL))
      AND ${importPermission}`,
    )
    .bind(actor.orgId, fullName, ...importAccessBindings(actor, now))
    .first<{
      id: string
      fullName: string
      githubId: number
      defaultBranch: string
    }>()
}

export const importUnavailable = () =>
  new HttpError(
    409,
    'import_unavailable',
    'The import is not available. Scan again.',
  )
