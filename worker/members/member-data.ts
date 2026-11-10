import type { OrgRole, User } from '../../src/shared/api'
import type { OrgMember } from '../../src/shared/members'
import { activeAdminMemberPredicate } from '../data/active-admin'
import { activeAdminPredicate } from './org-data'

interface MemberRow extends User {
  role: OrgRole
  joinedAt: number
}
const memberColumns = `u.id, u.github_id AS githubId, u.github_login AS githubLogin,
  u.display_name AS displayName, u.avatar_url AS avatarUrl, m.role, m.joined_at AS joinedAt`

const membershipMayEnd = `NOT (${activeAdminMemberPredicate('org_members')}) OR EXISTS (
  SELECT 1 FROM org_members remaining WHERE remaining.org_id = org_members.org_id
    AND remaining.user_id <> org_members.user_id AND ${activeAdminMemberPredicate('remaining')}
)`

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
     AND (? = 'admin' OR (${membershipMayEnd})) RETURNING user_id`,
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
    ? `SELECT candidate.user_id FROM org_members candidate
       JOIN users recipient_user ON recipient_user.id = candidate.user_id
       WHERE candidate.org_id = ? AND candidate.user_id <> ?
         AND (recipient_user.suspended_at IS NULL OR candidate.role = 'admin')
       ORDER BY CASE WHEN ${activeAdminMemberPredicate('candidate')} THEN 0
         WHEN recipient_user.suspended_at IS NULL THEN 1 ELSE 2 END,
         candidate.joined_at, candidate.user_id LIMIT 1`
    : `SELECT candidate.user_id FROM org_members candidate
       WHERE candidate.org_id = ? AND candidate.user_id = ?
         AND ${activeAdminMemberPredicate('candidate')}`
  const recipientId = voluntary ? userId : actorId
  const actorPermission = voluntary
    ? `EXISTS (
       SELECT 1 FROM orgs access_org
       JOIN org_members access_member ON access_member.org_id = access_org.id
       JOIN users access_user ON access_user.id = access_member.user_id
       WHERE access_org.id = ? AND access_member.user_id = ?
         AND access_org.deleted_at IS NULL AND access_user.suspended_at IS NULL
     )`
    : activeAdminPredicate
  const permission = `${actorPermission} AND EXISTS (
    SELECT 1 FROM org_members WHERE org_id = ? AND user_id = ? AND (${membershipMayEnd})
  )`
  const access = [orgId, actorId, orgId, userId]
  const result = await db.batch<{ id: string }>([
    db
      .prepare(
        `UPDATE workspaces SET owner_user_id = (${recipient}), updated_at = MAX(updated_at, ?)
       WHERE org_id = ? AND owner_user_id = ? AND EXISTS (${recipient}) AND ${permission}
       RETURNING id`,
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
        `UPDATE routines SET owner_user_id = (${recipient}), active = 0,
         inactive_reason = 'owner_left', next_run_at = NULL,
         moved_from_name = (SELECT COALESCE(display_name, github_login) FROM users WHERE id = ?),
         updated_at = ?
       WHERE org_id = ? AND owner_user_id = ? AND EXISTS (${recipient}) AND ${permission}`,
      )
      .bind(
        orgId,
        recipientId,
        userId,
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
  return result[2].meta.changes > 0
    ? result[0].results.map((row) => row.id)
    : null
}
