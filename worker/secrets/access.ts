import { HttpError } from '../http'
import { requireActiveOrg } from '../data/user-access'
import { requireOrgAdmin, requireOrgMember } from '../members/permissions'
import { readSecret } from './data'

export const secretMemberPredicate = `EXISTS (
  SELECT 1 FROM org_members m JOIN users u ON u.id = m.user_id
  JOIN orgs o ON o.id = m.org_id
  WHERE m.org_id = ? AND m.user_id = ? AND u.suspended_at IS NULL
    AND o.suspended_at IS NULL AND o.deleted_at IS NULL
)`

export const secretEditorPredicate = `EXISTS (
  SELECT 1 FROM org_members m JOIN users u ON u.id = m.user_id
  JOIN orgs o ON o.id = m.org_id
  WHERE m.org_id = ? AND m.user_id = ? AND u.suspended_at IS NULL
    AND o.suspended_at IS NULL AND o.deleted_at IS NULL
    AND (m.role = 'admin' OR org_secrets.created_by_user_id = m.user_id)
)`

export async function requireSecretWriter(
  db: D1Database,
  orgId: string,
  userId: string,
  secretId?: string,
  admin = false,
): Promise<void> {
  const org = admin
    ? await requireOrgAdmin(db, orgId, userId)
    : await requireOrgMember(db, orgId, userId)
  await requireActiveOrg(db, orgId)
  if (secretId) {
    const secret = await readSecret(db, orgId, secretId)
    if (!admin && org.role !== 'admin' && secret.createdByUserId !== userId)
      throw new HttpError(
        403,
        'secret_creator_required',
        'Only the member who added this secret or an org admin can change it.',
      )
  }
}
