import { HttpError } from '../http'

export interface UserAccess {
  id: string
  suspendedAt: number | null
}

export function githubUserAccess(
  db: D1Database,
  githubId: number,
): Promise<UserAccess | null> {
  return db
    .prepare(
      'SELECT id, suspended_at AS suspendedAt FROM users WHERE github_id = ?',
    )
    .bind(githubId)
    .first<UserAccess>()
}

export async function userSuspended(
  db: D1Database,
  userId: string,
): Promise<boolean> {
  const user = await db
    .prepare('SELECT suspended_at AS suspendedAt FROM users WHERE id = ?')
    .bind(userId)
    .first<{ suspendedAt: number | null }>()
  return user?.suspendedAt !== undefined && user.suspendedAt !== null
}

export async function requireActiveUser(
  db: D1Database,
  userId: string,
): Promise<void> {
  if (await userSuspended(db, userId)) throw suspendedUserError()
}

export function suspendedUserError(): HttpError {
  return new HttpError(403, 'user_suspended', 'This account is suspended.')
}

export function suspendedWorkspace(
  db: D1Database,
  workspaceId: string,
): Promise<{
  ownerUserId: string
  orgId: string
  sandboxId: string | null
  orgDeletedAt: number | null
} | null> {
  return db
    .prepare(
      `SELECT w.owner_user_id AS ownerUserId, w.org_id AS orgId, w.sandbox_id AS sandboxId,
         o.deleted_at AS orgDeletedAt
       FROM workspaces w JOIN users u ON u.id = w.owner_user_id
       JOIN orgs o ON o.id = w.org_id
       WHERE w.id = ? AND u.suspended_at IS NOT NULL`,
    )
    .bind(workspaceId)
    .first()
}
