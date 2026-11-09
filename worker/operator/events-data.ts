import { HttpError } from '../http'

export type SuspensionTarget =
  { kind: 'user'; githubId: number } | { kind: 'org'; orgId: string }

interface SuspensionState {
  id: string
  suspendedAt: number | null
}

function suspensionRevocations(
  db: D1Database,
  target: SuspensionTarget,
  now: number,
): D1PreparedStatement[] {
  const value = target.kind === 'user' ? target.githubId : target.orgId
  const workspaces =
    target.kind === 'user'
      ? 'SELECT id FROM workspaces WHERE owner_user_id IN (SELECT id FROM users WHERE github_id = ?)'
      : 'SELECT id FROM workspaces WHERE org_id = ?'
  const previews =
    target.kind === 'user' ? `workspace_id IN (${workspaces})` : 'org_id = ?'
  return [
    ...(target.kind === 'user'
      ? [
          db
            .prepare(
              'DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE github_id = ?)',
            )
            .bind(value),
        ]
      : []),
    db
      .prepare(
        `UPDATE workspace_tokens SET revoked_at = ? WHERE revoked_at IS NULL
       AND workspace_id IN (${workspaces})`,
      )
      .bind(now, value),
    db
      .prepare(
        `UPDATE preview_hostnames SET revoked_at = ? WHERE revoked_at IS NULL AND ${previews}`,
      )
      .bind(now, value),
  ]
}

export async function recordSuspensionChange(
  db: D1Database,
  target: SuspensionTarget,
  action: 'suspend' | 'lift',
  operatorId: string,
  now: number,
): Promise<SuspensionState & { changed: boolean }> {
  const table = target.kind === 'user' ? 'users' : 'orgs'
  const key = target.kind === 'user' ? 'github_id' : 'id'
  const value = target.kind === 'user' ? target.githubId : target.orgId
  const state = action === 'suspend' ? 'IS NULL' : 'IS NOT NULL'
  const results = await db.batch<SuspensionState>([
    db
      .prepare(
        `INSERT INTO suspension_events
         (target_kind, target_id, action, occurred_at, operator_user_id)
         SELECT ?, id, ?, ?, ? FROM ${table}
         WHERE ${key} = ? AND suspended_at ${state}`,
      )
      .bind(target.kind, action, now, operatorId, value),
    db
      .prepare(
        `UPDATE ${table} SET suspended_at = ?, suspended_by_user_id = ?
         WHERE ${key} = ? AND suspended_at ${state}`,
      )
      .bind(
        action === 'suspend' ? now : null,
        action === 'suspend' ? operatorId : null,
        value,
      ),
    ...(action === 'suspend' ? suspensionRevocations(db, target, now) : []),
    db
      .prepare(
        `SELECT id, suspended_at AS suspendedAt FROM ${table} WHERE ${key} = ?`,
      )
      .bind(value),
  ])
  const row = results.at(-1)?.results[0]
  if (!row)
    throw new HttpError(
      404,
      target.kind === 'user' ? 'user_not_found' : 'org_not_found',
      target.kind === 'user'
        ? 'The account is not available.'
        : 'The org is not available.',
    )
  return { ...row, changed: results[0].meta.changes === 1 }
}
