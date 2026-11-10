import { HttpError } from '../http'

export interface LeasedImage {
  imageName: string
  providerAccount: string
}

export async function leasedCreationImage(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  repositoryId: string,
): Promise<LeasedImage & { defaultBranch: string }> {
  const row = await db
    .prepare(
      `SELECT l.snapshot_name AS imageName, l.provider_account AS providerAccount,
       p.default_branch AS defaultBranch
       FROM image_leases l JOIN workspace_creation_plans p
         ON p.workspace_id = l.workspace_id AND p.image_name = l.snapshot_name
         AND p.provider_account = l.provider_account
       WHERE l.org_id = ? AND l.workspace_id = ? AND p.repository_id = ?`,
    )
    .bind(orgId, workspaceId, repositoryId)
    .first<LeasedImage & { defaultBranch: string }>()
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
): Promise<LeasedImage> {
  const row = await db
    .prepare(
      'SELECT snapshot_name AS imageName, provider_account AS providerAccount FROM image_leases WHERE org_id = ? AND workspace_id = ?',
    )
    .bind(orgId, workspaceId)
    .first<LeasedImage>()
  if (!row)
    throw new HttpError(
      409,
      'image_required',
      'Ask an org admin to build the cloud computer image first.',
    )
  return row
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
  providerAccount: string,
): Promise<boolean> {
  return Boolean(
    await db
      .prepare(
        'SELECT workspace_id FROM image_leases WHERE org_id = ? AND snapshot_name = ? AND provider_account = ? LIMIT 1',
      )
      .bind(orgId, snapshot, providerAccount)
      .first(),
  )
}
