import type { OrgInvite } from '../../src/shared/members'
import { activeAdminPredicate } from './org-data'

const columns = 'id, github_login AS githubLogin, created_at AS createdAt'

export async function listInvites(db: D1Database, orgId: string) {
  return (
    await db
      .prepare(
        `SELECT ${columns} FROM org_invites WHERE org_id = ? ORDER BY created_at, id`,
      )
      .bind(orgId)
      .all<OrgInvite>()
  ).results
}

export async function insertInvite(
  db: D1Database,
  orgId: string,
  actorId: string,
  id: string,
  githubLogin: string,
  now: number,
) {
  return db
    .prepare(
      `INSERT INTO org_invites (id, org_id, github_login, invited_by_user_id, created_at)
     SELECT ?, ?, ?, ?, ? WHERE ${activeAdminPredicate}
     ON CONFLICT (org_id, github_login) DO UPDATE SET github_login = org_invites.github_login
     RETURNING ${columns}`,
    )
    .bind(id, orgId, githubLogin, actorId, now, orgId, actorId)
    .first<OrgInvite>()
}

export async function deleteInvite(
  db: D1Database,
  orgId: string,
  actorId: string,
  id: string,
) {
  return db
    .prepare(
      `DELETE FROM org_invites WHERE id = ? AND org_id = ? AND ${activeAdminPredicate} RETURNING id`,
    )
    .bind(id, orgId, orgId, actorId)
    .first<{ id: string }>()
}

export async function takeInvite(
  db: D1Database,
  orgId: string,
  userId: string,
  inviteId: string,
  now: number,
) {
  const identity = `SELECT 1 FROM org_invites i JOIN users u ON u.github_login = i.github_login COLLATE NOCASE
    JOIN orgs o ON o.id = i.org_id WHERE i.id = ? AND i.org_id = ? AND u.id = ? AND o.deleted_at IS NULL`
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO org_members (org_id, user_id, role, joined_at)
       SELECT ?, ?, 'member', ? WHERE EXISTS (${identity})
       ON CONFLICT (org_id, user_id) DO NOTHING`,
      )
      .bind(orgId, userId, now, inviteId, orgId, userId),
    db
      .prepare(
        `DELETE FROM org_invites WHERE id = ? AND org_id = ? AND EXISTS (${identity}) RETURNING id`,
      )
      .bind(inviteId, orgId, inviteId, orgId, userId),
  ])
  return results[1].meta.changes > 0
}
