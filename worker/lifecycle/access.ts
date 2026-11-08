import type { Org } from '../../src/shared/api'
import { findMembership } from '../data/orgs'
import { requireActiveUser } from '../data/user-access'
import { HttpError } from '../http'

export async function requireOrgMember(
  db: D1Database,
  orgId: string,
  userId: string,
  admin = false,
): Promise<Org> {
  await requireActiveUser(db, userId)
  const org = await findMembership(db, orgId, userId)
  if (!org) {
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  }
  if (admin && org.role !== 'admin') {
    throw new HttpError(403, 'admin_required', 'Ask an org admin to continue.')
  }
  return org
}

export async function requireWorkspaceOrg(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<void> {
  const row = await db
    .prepare(
      `SELECT workspaces.id FROM workspaces
       JOIN orgs ON orgs.id = workspaces.org_id
       WHERE workspaces.id = ? AND workspaces.org_id = ?
         AND orgs.deleted_at IS NULL`,
    )
    .bind(workspaceId, orgId)
    .first<{ id: string }>()
  if (!row) {
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
}
