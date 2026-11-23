import type { AppEnv } from '../env'
import { readWorkspace } from '../lifecycle/workspace-data'
import { HttpError } from '../http'
import { requireOrgMember } from '../members/permissions'
import { requireActiveOrg } from '../data/user-access'
import { activeOrgPredicate } from '../data/org-access'
import { workspaceTreeSql } from './feature-workspaces-data'

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
      `UPDATE workspaces SET archived_at = ?, state = 'archived', running_since = NULL,
      updated_at = MAX(?, updated_at + 1) WHERE id = ? AND org_id = ? AND archived_at IS NULL
      AND EXISTS (SELECT 1 FROM orgs o JOIN org_members m ON m.org_id = o.id
        JOIN users u ON u.id = m.user_id AND u.suspended_at IS NULL
        WHERE o.id = workspaces.org_id AND o.deleted_at IS NULL AND m.user_id = ?
        AND ${activeOrgPredicate('o')}
        AND (m.role = 'admin' OR workspaces.owner_user_id = m.user_id))`,
    ).bind(now, now, id, orgId, userId),
    env.DB.prepare(
      `${workspaceTreeSql}, archive_place AS MATERIALIZED (
         SELECT section_id, position, MAX(0, (SELECT COUNT(*) FROM promoted) - 1) AS shift
         FROM tree_rows WHERE id = ?2 AND NOT queued
       ), promoted_places AS MATERIALIZED (
         SELECT w.id, p.position + ROW_NUMBER() OVER (ORDER BY w.created_at, w.id) - 1 AS position
         FROM tree_rows w JOIN promoted ON promoted.id = w.id CROSS JOIN archive_place p
       ) UPDATE workspaces SET
       section_id = CASE WHEN id IN (SELECT id FROM promoted_places)
         THEN (SELECT section_id FROM archive_place) ELSE section_id END,
       position = COALESCE(
         (SELECT position FROM promoted_places WHERE id = workspaces.id),
         position + (SELECT shift FROM archive_place)
       ) WHERE changes() > 0 AND org_id = ?1 AND (
         id IN (SELECT id FROM promoted_places) OR (
           section_id = (SELECT section_id FROM archive_place)
           AND position > (SELECT position FROM archive_place)
           AND (SELECT shift FROM archive_place) > 0
         )
       )
       RETURNING id`,
    ).bind(orgId, id),
    env.DB.prepare(
      `UPDATE workspace_tokens SET revoked_at = COALESCE(revoked_at, ?)
      WHERE workspace_id = ? AND EXISTS (SELECT 1 FROM workspaces WHERE id = ? AND state = 'archived')`,
    ).bind(now, id, id),
  ])
  await requireActiveOrg(env.DB, orgId)
}
