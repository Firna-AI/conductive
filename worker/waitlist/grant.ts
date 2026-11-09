import { randomAccessCode } from './codes'
import { openSignupPredicate } from './data'

export type AppAccessGrant =
  | { source: 'existing' | 'operator' | 'open_signup' }
  | { source: 'approval'; operatorUserId: string }
  | { source: 'code'; code: string }
  | { source: 'org_invitation'; orgId: string; invitationId: string }

interface GrantCondition {
  sql: string
  bindings: readonly (string | number | null)[]
}

/** Include these statements in the batch that authorizes the grant. */
export function appAccessGrantStatements(
  db: D1Database,
  userId: string,
  grant: AppAccessGrant,
  now: number,
  condition: GrantCondition = { sql: '1', bindings: [] },
): D1PreparedStatement[] {
  const record = grantRecord(userId, grant, now)
  const openSignup =
    grant.source === 'open_signup' ? ` AND ${openSignupPredicate}` : ''
  return [
    db
      .prepare(
        `INSERT INTO user_app_access
         (user_id, granted_at, source, operator_user_id, code, org_id,
          invitation_id, invited_by_user_id)
         ${record.sql} AND (${condition.sql})${openSignup}
         ON CONFLICT (user_id) DO NOTHING`,
      )
      .bind(...record.bindings, ...condition.bindings),
    db
      .prepare(
        `INSERT INTO access_codes
         (code, kind, use_limit, owner_user_id, created_at)
         SELECT ?, 'referral', 5, user_id, granted_at FROM user_app_access
         WHERE user_id = ? AND NOT EXISTS (
           SELECT 1 FROM access_codes WHERE kind = 'referral' AND owner_user_id = ?
         ) ON CONFLICT (owner_user_id) WHERE kind = 'referral' DO NOTHING`,
      )
      .bind(randomAccessCode(), userId, userId),
  ]
}

export async function grantAppAccess(
  db: D1Database,
  userId: string,
  grant: AppAccessGrant,
  now: number,
): Promise<boolean> {
  const results = await db.batch(
    appAccessGrantStatements(db, userId, grant, now),
  )
  return results[0].meta.changes > 0
}

function grantRecord(userId: string, grant: AppAccessGrant, now: number) {
  switch (grant.source) {
    case 'open_signup':
      return {
        sql: `SELECT ?, ?, 'open_signup', waitlist_updated_by_user_id, NULL, NULL, NULL, NULL
          FROM signup_settings WHERE id = 1`,
        bindings: [userId, now],
      }
    case 'code':
      return {
        sql: `SELECT u.user_id, u.used_at,
          CASE c.kind WHEN 'invite' THEN 'invite_code' ELSE 'referral_code' END,
          NULL, c.code, NULL, NULL, NULL
          FROM access_code_uses u JOIN access_codes c ON c.code = u.code
          WHERE u.user_id = ? AND c.code = ?`,
        bindings: [userId, grant.code],
      }
    case 'org_invitation':
      return {
        sql: `SELECT ?, ?, 'org_invitation', NULL, NULL, i.org_id, i.id, i.invited_by_user_id
          FROM org_invites i WHERE i.id = ? AND i.org_id = ?`,
        bindings: [userId, now, grant.invitationId, grant.orgId],
      }
    default:
      return {
        sql: `SELECT ?, ?, ?, ?, NULL, NULL, NULL, NULL
          WHERE EXISTS (SELECT 1 FROM users WHERE id = ?)`,
        bindings: [
          userId,
          now,
          grant.source,
          grant.source === 'approval' ? grant.operatorUserId : null,
          userId,
        ],
      }
  }
}
