import { HttpError } from '../http'

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
