import { normalizeAccessCode } from './codes'
import { signupsOpenPredicate } from './data'
import { inviteCodeError, type InviteCodeFailure } from './errors'
import { appAccessGrantStatements } from './grant'

export async function redeemInviteCode(
  db: D1Database,
  userId: string,
  value: string,
  now: number,
): Promise<void> {
  const code = normalizeAccessCode(value)
  const results = await db.batch<{ failure: InviteCodeFailure | null }>([
    db
      .prepare(
        `INSERT INTO access_code_uses (code, user_id, used_at)
         SELECT c.code, ?, ? FROM access_codes c
         WHERE c.code = ? AND c.disabled_at IS NULL
           AND (SELECT COUNT(*) FROM access_code_uses WHERE code = c.code) < c.use_limit
           AND ${signupsOpenPredicate}
           AND NOT EXISTS (SELECT 1 FROM user_app_access WHERE user_id = ?)
         ON CONFLICT (user_id) DO NOTHING`,
      )
      .bind(userId, now, code, userId),
    ...appAccessGrantStatements(db, userId, { source: 'code', code }, now),
    db
      .prepare(
        `SELECT CASE
           WHEN EXISTS (SELECT 1 FROM user_app_access WHERE user_id = ?) THEN NULL
           WHEN c.code IS NULL THEN 'invite_code_not_found'
           WHEN c.disabled_at IS NOT NULL THEN 'invite_code_disabled'
           WHEN (SELECT COUNT(*) FROM access_code_uses WHERE code = c.code) >= c.use_limit
             THEN 'invite_code_used_up'
           WHEN NOT (${signupsOpenPredicate}) THEN 'signups_paused'
         END AS failure
         FROM (SELECT ? AS code) requested LEFT JOIN access_codes c ON c.code = requested.code`,
      )
      .bind(userId, code),
  ])
  const failure = results[results.length - 1].results[0].failure
  if (failure) throw inviteCodeError(failure)
}
