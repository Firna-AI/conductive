import { requireOrgAdmin } from './permissions'

/** Key repair stays available to a current admin while an org is deleted. */
export async function assertCanMaintainOrgKey(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<void> {
  await requireOrgAdmin(db, orgId, userId, true)
}

/** The key owner binds org ID and actor ID on its atomic encrypted-key write. */
export const orgKeyMaintenancePredicate = `EXISTS (
  SELECT 1 FROM orgs key_org JOIN org_members key_admin ON key_admin.org_id = key_org.id
  WHERE key_org.id = ? AND key_admin.user_id = ? AND key_admin.role = 'admin'
)`
