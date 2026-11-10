import type { FeedbackContext } from '../../src/shared/feedback'

export type FeedbackIds = Pick<FeedbackContext, 'orgId' | 'workspaceId'>

export async function feedbackReplyEmail(
  db: D1Database,
  userId: string,
): Promise<string | null> {
  const row = await db
    .prepare('SELECT primary_verified_email AS email FROM users WHERE id = ?')
    .bind(userId)
    .first<{ email: string | null }>()
  return row?.email ?? null
}

export async function reachableFeedbackIds(
  db: D1Database,
  userId: string,
  ids: FeedbackIds,
): Promise<FeedbackIds> {
  const row = await db
    .prepare(
      `SELECT o.id AS orgId, w.id AS workspaceId
       FROM orgs o JOIN org_members m ON m.org_id = o.id AND m.user_id = ?
       LEFT JOIN workspaces w ON w.org_id = o.id AND w.id = ?
       WHERE o.id = ? AND o.deleted_at IS NULL`,
    )
    .bind(userId, ids.workspaceId, ids.orgId)
    .first<FeedbackIds>()
  return row ?? { orgId: null, workspaceId: null }
}
