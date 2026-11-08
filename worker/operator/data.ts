import { HttpError } from '../http'

export async function recordUserSuspension(
  db: D1Database,
  githubId: number,
  operatorId: string,
  now: number,
): Promise<{ userId: string; suspendedAt: number }> {
  const user = await db
    .prepare(
      `UPDATE users SET suspended_at = COALESCE(suspended_at, ?),
       suspended_by_user_id = COALESCE(suspended_by_user_id, ?)
       WHERE github_id = ? RETURNING id AS userId, suspended_at AS suspendedAt`,
    )
    .bind(now, operatorId, githubId)
    .first<{ userId: string; suspendedAt: number }>()
  if (!user)
    throw new HttpError(404, 'user_not_found', 'The account is not available.')
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.userId),
    db
      .prepare(
        `UPDATE workspace_tokens SET revoked_at = ? WHERE revoked_at IS NULL
       AND workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = ?)`,
      )
      .bind(now, user.userId),
    db
      .prepare(
        `UPDATE preview_hostnames SET revoked_at = ? WHERE revoked_at IS NULL
       AND workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = ?)`,
      )
      .bind(now, user.userId),
  ])
  return user
}

export async function ownedWorkspaces(db: D1Database, userId: string) {
  const { results } = await db
    .prepare('SELECT id FROM workspaces WHERE owner_user_id = ? ORDER BY id')
    .bind(userId)
    .all<{ id: string }>()
  return results
}

export async function ownedBuilds(db: D1Database, userId: string) {
  const { results } = await db
    .prepare(
      `SELECT b.id, b.org_id AS orgId FROM image_builds b
       JOIN image_build_jobs j ON j.build_id = b.id
       WHERE b.started_by_user_id = ? AND j.phase != 'done' ORDER BY b.id`,
    )
    .bind(userId)
    .all<{ id: string; orgId: string }>()
  return results
}
