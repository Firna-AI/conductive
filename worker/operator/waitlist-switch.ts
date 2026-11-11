import type { OperatorWaitlistSwitch } from '../../src/shared/operator-waitlist'
import { waitingUserPredicate } from './waitlist-directory'

export async function readWaitlistSwitch(
  db: D1Database,
): Promise<OperatorWaitlistSwitch> {
  const row = await db
    .prepare(
      `SELECT s.waitlist_on AS waitlistOn, s.waitlist_updated_at AS updatedAt,
       actor.github_id AS githubId, actor.github_login AS login,
       (SELECT COUNT(*) FROM users u WHERE ${waitingUserPredicate}) AS waiting
       FROM signup_settings s
       LEFT JOIN users actor ON actor.id = s.waitlist_updated_by_user_id WHERE s.id = 1`,
    )
    .first<{
      waitlistOn: number
      updatedAt: number | null
      githubId: number | null
      login: string | null
      waiting: number
    }>()
  if (!row) throw new Error('The sign-up settings are not available')
  return {
    waitlistOn: Boolean(row.waitlistOn),
    updatedAt: row.updatedAt,
    operator:
      row.githubId !== null && row.login !== null
        ? { githubId: row.githubId, login: row.login }
        : null,
    waiting: row.waiting,
  }
}

export async function changeWaitlistSwitch(
  db: D1Database,
  waitlistOn: boolean,
  operatorId: string,
  now: number,
) {
  await db
    .prepare(
      `UPDATE signup_settings SET waitlist_on = ?1, waitlist_updated_at = ?2,
       waitlist_updated_by_user_id = ?3 WHERE id = 1 AND waitlist_on != ?1`,
    )
    .bind(waitlistOn ? 1 : 0, now, operatorId)
    .run()
  return readWaitlistSwitch(db)
}
