import { HttpError } from '../http'

export async function leasedCreationImage(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  repositoryId: string,
): Promise<{
  imageName: string
  defaultBranch: string
  runnerProtocolVersion: number
}> {
  const row = await db
    .prepare(
      `SELECT l.snapshot_name AS imageName, p.default_branch AS defaultBranch,
         COALESCE(b.runner_protocol_version, 1) AS runnerProtocolVersion
       FROM image_leases l JOIN workspace_creation_plans p
         ON p.workspace_id = l.workspace_id AND p.image_name = l.snapshot_name
       LEFT JOIN image_builds b ON b.org_id = l.org_id
         AND b.snapshot_name = l.snapshot_name AND b.state = 'succeeded'
       WHERE l.org_id = ? AND l.workspace_id = ? AND p.repository_id = ?`,
    )
    .bind(orgId, workspaceId, repositoryId)
    .first<{
      imageName: string
      defaultBranch: string
      runnerProtocolVersion: number
    }>()
  if (!row)
    throw new HttpError(
      409,
      'image_required',
      'Ask an org admin to build the cloud computer image first.',
    )
  return row
}

export async function leasedImage(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<string> {
  const row = await db
    .prepare(
      'SELECT snapshot_name AS name FROM image_leases WHERE org_id = ? AND workspace_id = ?',
    )
    .bind(orgId, workspaceId)
    .first<{ name: string }>()
  if (!row)
    throw new HttpError(
      409,
      'image_required',
      'Ask an org admin to build the cloud computer image first.',
    )
  return row.name
}

export async function releaseImageLease(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<void> {
  await db
    .prepare('DELETE FROM image_leases WHERE org_id = ? AND workspace_id = ?')
    .bind(orgId, workspaceId)
    .run()
}

export async function imageIsLeased(
  db: D1Database,
  orgId: string,
  snapshot: string,
): Promise<boolean> {
  return Boolean(
    await db
      .prepare(
        'SELECT workspace_id FROM image_leases WHERE org_id = ? AND snapshot_name = ? LIMIT 1',
      )
      .bind(orgId, snapshot)
      .first(),
  )
}
