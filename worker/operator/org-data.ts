import { recordSuspensionChange } from './events-data'

export async function recordOrgSuspension(
  db: D1Database,
  orgId: string,
  operatorId: string,
  now: number,
): Promise<{ orgId: string; suspendedAt: number }> {
  const recorded = await recordSuspensionChange(
    db,
    { kind: 'org', orgId },
    'suspend',
    operatorId,
    now,
  )
  if (recorded.suspendedAt === null)
    throw new Error('Missing recorded org suspension')
  return { orgId: recorded.id, suspendedAt: recorded.suspendedAt }
}

export async function orgWorkspaces(db: D1Database, orgId: string) {
  return (
    await db
      .prepare(
        'SELECT id, owner_user_id AS ownerUserId FROM workspaces WHERE org_id = ? ORDER BY id',
      )
      .bind(orgId)
      .all<{ id: string; ownerUserId: string }>()
  ).results
}

export async function orgBuilds(db: D1Database, orgId: string) {
  return (
    await db
      .prepare(
        `SELECT b.id FROM image_builds b JOIN image_build_jobs j ON j.build_id = b.id
         WHERE b.org_id = ? AND j.phase != 'done' ORDER BY b.id`,
      )
      .bind(orgId)
      .all<{ id: string }>()
  ).results
}
