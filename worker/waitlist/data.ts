import type { WaitlistStateResponse } from '../../src/shared/waitlist'
import { displayAccessCode } from './codes'

export const signupsOpenPredicate = `NOT EXISTS (
  SELECT 1 FROM signup_settings WHERE id = 1 AND paused = 1
)`

export async function hasAppAccess(db: D1Database, userId: string) {
  return (
    (await db
      .prepare('SELECT 1 FROM user_app_access WHERE user_id = ?')
      .bind(userId)
      .first()) !== null
  )
}

export async function canAcceptSignup(db: D1Database, userId: string) {
  return (
    (await db
      .prepare(
        `SELECT 1 WHERE ${signupsOpenPredicate} OR EXISTS (
          SELECT 1 FROM user_app_access WHERE user_id = ?
        )`,
      )
      .bind(userId)
      .first()) !== null
  )
}

export async function readWaitlistState(
  db: D1Database,
  userId: string,
): Promise<WaitlistStateResponse> {
  const row = await db
    .prepare(
      `SELECT a.user_id IS NOT NULL AS appAccess,
         NOT (${signupsOpenPredicate}) AS signupsPaused,
         u.primary_verified_email AS approvalEmail, c.code,
         c.use_limit AS useLimit, c.disabled_at IS NOT NULL AS disabled,
         (SELECT COUNT(*) FROM access_code_uses WHERE code = c.code) AS uses
       FROM users u LEFT JOIN user_app_access a ON a.user_id = u.id
       LEFT JOIN access_codes c ON c.owner_user_id = a.user_id AND c.kind = 'referral'
       WHERE u.id = ?`,
    )
    .bind(userId)
    .first<{
      appAccess: number
      signupsPaused: number
      approvalEmail: string | null
      code: string | null
      useLimit: number | null
      disabled: number
      uses: number
    }>()
  if (!row) throw new Error('The waitlist user is not available')
  return {
    appAccess: Boolean(row.appAccess),
    signupsPaused: Boolean(row.signupsPaused),
    approvalEmail: row.approvalEmail,
    referralCode:
      row.code && row.useLimit !== null
        ? {
            code: displayAccessCode(row.code),
            useLimit: row.useLimit,
            uses: row.uses,
            disabled: Boolean(row.disabled),
          }
        : null,
  }
}
