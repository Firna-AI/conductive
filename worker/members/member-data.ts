import type { OrgRole, User } from '../../src/shared/api'
import type { OrgMember } from '../../src/shared/members'
import { activeAdminPredicate } from './org-data'

interface MemberRow extends User {
  role: OrgRole
  joinedAt: number
}
const memberColumns = `u.id, u.github_id AS githubId, u.github_login AS githubLogin,
  u.display_name AS displayName, u.avatar_url AS avatarUrl, m.role, m.joined_at AS joinedAt`

function member(row: MemberRow): OrgMember {
  const { role, joinedAt, ...user } = row
  return { user, role, joinedAt }
}

export async function orgMembers(
  db: D1Database,
  orgId: string,
): Promise<OrgMember[]> {
  const { results } = await db
    .prepare(
      `SELECT ${memberColumns} FROM org_members m JOIN users u ON u.id = m.user_id
     WHERE m.org_id = ? ORDER BY m.joined_at, m.user_id`,
    )
    .bind(orgId)
    .all<MemberRow>()
  return results.map(member)
}

export async function orgMember(
  db: D1Database,
  orgId: string,
  userId: string,
): Promise<OrgMember | null> {
  const row = await db
    .prepare(
      `SELECT ${memberColumns} FROM org_members m JOIN users u ON u.id = m.user_id
     WHERE m.org_id = ? AND m.user_id = ?`,
    )
    .bind(orgId, userId)
    .first<MemberRow>()
  return row ? member(row) : null
}

export function updateRole(
  db: D1Database,
  orgId: string,
  actorId: string,
  userId: string,
  role: OrgRole,
) {
  return db
    .prepare(
      `UPDATE org_members SET role = ? WHERE org_id = ? AND user_id = ?
     AND ${activeAdminPredicate}
     AND (? = 'admin' OR role <> 'admin' OR EXISTS (
       SELECT 1 FROM org_members remaining WHERE remaining.org_id = org_members.org_id
       AND remaining.role = 'admin' AND remaining.user_id <> org_members.user_id
     )) RETURNING user_id`,
    )
    .bind(role, orgId, userId, orgId, actorId, role)
    .first<{ user_id: string }>()
}

export async function removeMembership(
  db: D1Database,
  orgId: string,
  actorId: string,
  userId: string,
  voluntary: boolean,
  now: number,
) {
  const recipient = voluntary
    ? `SELECT user_id FROM org_members WHERE org_id = ? AND role = 'admin'
       AND user_id <> ? ORDER BY joined_at, user_id LIMIT 1`
    : "SELECT user_id FROM org_members WHERE org_id = ? AND user_id = ? AND role = 'admin'"
  const recipientId = voluntary ? userId : actorId
  const permission = voluntary
    ? `EXISTS (SELECT 1 FROM orgs WHERE id = ? AND deleted_at IS NULL)`
    : activeAdminPredicate
  const access = voluntary ? [orgId] : [orgId, actorId]
  const result = await db.batch([
    db
      .prepare(
        `UPDATE workspaces SET owner_user_id = (${recipient}), updated_at = ?
       WHERE org_id = ? AND owner_user_id = ? AND EXISTS (${recipient}) AND ${permission}`,
      )
      .bind(
        orgId,
        recipientId,
        now,
        orgId,
        userId,
        orgId,
        recipientId,
        ...access,
      ),
    db
      .prepare(
        `DELETE FROM org_members WHERE org_id = ? AND user_id = ? AND ${permission}
       AND EXISTS (${recipient})`,
      )
      .bind(orgId, userId, ...access, orgId, recipientId),
  ])
  return result[1].meta.changes > 0
}
