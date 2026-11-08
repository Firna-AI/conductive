import type { AppEnv } from '../env'
import { readWorkspace } from '../lifecycle/workspace-data'
import { HttpError } from '../http'
import { requireOrgMember } from '../members/permissions'
import { requireActiveOrg } from '../data/user-access'
import { activeOrgPredicate } from '../data/org-access'

export async function archiveWorkspaceAccess(
  env: AppEnv,
  orgId: string,
  id: string,
  userId: string,
) {
  await requireActiveOrg(env.DB, orgId)
  const org = await requireOrgMember(env.DB, orgId, userId)
  const row = await readWorkspace(env.DB, orgId, id)
  if (org.role !== 'admin' && row.ownerUserId !== userId)
    throw new HttpError(
      403,
      'archive_forbidden',
      'Ask the workspace owner or an org admin to archive it.',
    )
  return row
}

export async function markWorkspaceArchived(
  env: AppEnv,
  orgId: string,
  id: string,
  userId: string,
  now: number,
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE workspaces SET archived_at = ?, state = 'archived', sandbox_id = NULL,
      next_disk_keepalive_at = NULL, updated_at = ? WHERE id = ? AND org_id = ?
      AND EXISTS (SELECT 1 FROM orgs o JOIN org_members m ON m.org_id = o.id
        JOIN users u ON u.id = m.user_id AND u.suspended_at IS NULL
        WHERE o.id = workspaces.org_id AND o.deleted_at IS NULL AND m.user_id = ?
        AND ${activeOrgPredicate('o')}
        AND (m.role = 'admin' OR workspaces.owner_user_id = m.user_id))`,
    ).bind(now, now, id, orgId, userId),
    env.DB.prepare(
      `UPDATE workspace_tokens SET revoked_at = COALESCE(revoked_at, ?)
      WHERE workspace_id = ? AND EXISTS (SELECT 1 FROM workspaces WHERE id = ? AND state = 'archived')`,
    ).bind(now, id, id),
    env.DB.prepare(
      `DELETE FROM image_leases WHERE workspace_id = ? AND EXISTS
      (SELECT 1 FROM workspaces WHERE id = ? AND state = 'archived')`,
    ).bind(id, id),
  ])
  await requireActiveOrg(env.DB, orgId)
}
