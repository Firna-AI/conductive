import type { User } from '../../src/shared/api'
import { HttpError } from '../http'

export async function toolUser(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<User> {
  const user = await db
    .prepare(
      `SELECT u.id, u.github_id AS githubId, u.github_login AS githubLogin,
    u.display_name AS displayName, u.avatar_url AS avatarUrl FROM users u
    JOIN org_members m ON m.user_id = u.id JOIN orgs o ON o.id = m.org_id
    WHERE m.org_id = ? AND u.id = ? AND u.suspended_at IS NULL AND o.deleted_at IS NULL`,
    )
    .bind(orgId, userId)
    .first<User>()
  if (!user)
    throw new HttpError(
      403,
      'membership_required',
      'The workspace needs a current org member.',
    )
  return user
}

export async function saveWorkspaceToolParent(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  parentId: string,
): Promise<void> {
  await db
    .prepare(
      'UPDATE workspaces SET created_by_workspace_id = ? WHERE id = ? AND org_id = ?',
    )
    .bind(parentId, workspaceId, orgId)
    .run()
}
