import { recordSuspensionChange } from './events-data'

export async function recordUserSuspension(
  db: D1Database,
  githubId: number,
  operatorId: string,
  now: number,
): Promise<{ userId: string; suspendedAt: number }> {
  const recorded = await recordSuspensionChange(
    db,
    { kind: 'user', githubId },
    'suspend',
    operatorId,
    now,
  )
  if (recorded.suspendedAt === null)
    throw new Error('Missing recorded user suspension')
  return { userId: recorded.id, suspendedAt: recorded.suspendedAt }
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
