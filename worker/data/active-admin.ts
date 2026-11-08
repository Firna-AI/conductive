type AdminMemberAlias =
  'm' | 'access_member' | 'org_members' | 'remaining' | 'candidate'

export function activeAdminMemberPredicate(alias: AdminMemberAlias): string {
  return `${alias}.role = 'admin' AND EXISTS (
    SELECT 1 FROM users active_admin_user
    WHERE active_admin_user.id = ${alias}.user_id
      AND active_admin_user.suspended_at IS NULL
  )`
}
