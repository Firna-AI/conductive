import { HttpError } from '../http'

export type SuspensionTarget =
  { kind: 'user'; githubId: number } | { kind: 'org'; orgId: string }

interface SuspensionState {
  id: string
  suspendedAt: number | null
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
    db
      .prepare(
        `SELECT id, suspended_at AS suspendedAt FROM ${table} WHERE ${key} = ?`,
      )
      .bind(value),
  ])
  const row = results[2].results[0]
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
