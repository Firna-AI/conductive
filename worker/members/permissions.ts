import { HttpError } from '../http'
import { requireActiveOrg, requireActiveUser } from '../data/user-access'
import { visibleOrg } from './org-data'

export async function requireOrgMember(
  db: D1Database,
  orgId: string,
  userId: string,
  allowDeleted = false,
) {
  await requireActiveUser(db, userId)
  const org = await visibleOrg(db, orgId, userId)
  if (!org || (org.deletion && !allowDeleted)) {
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  }
  return org
}

export async function requireOrgAdmin(
  db: D1Database,
  orgId: string,
  userId: string,
  allowDeleted = false,
) {
  const org = await requireOrgMember(db, orgId, userId, allowDeleted)
  await requireActiveOrg(db, orgId)
  if (org.role !== 'admin') {
    throw new HttpError(
      403,
      'admin_required',
      'Ask an org admin to make this change.',
    )
  }
  return org
}

/** Settings owners call this before any repository, script, env var, or build write. */
export async function assertCanChangeSharedSettings(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<void> {
  await requireOrgAdmin(db, orgId, userId)
}
