import type { OperatorSignupPause } from '../../src/shared/operator-waitlist'

export async function readSignupPause(
  db: D1Database,
): Promise<OperatorSignupPause> {
  const row = await db
    .prepare(
      `SELECT s.paused, s.updated_at AS updatedAt, u.github_id AS githubId, u.github_login AS login
     FROM signup_settings s LEFT JOIN users u ON u.id = s.updated_by_user_id WHERE s.id = 1`,
    )
    .first<{
      paused: number
      updatedAt: number | null
      githubId: number | null
      login: string | null
    }>()
  if (!row) throw new Error('The sign-up settings are not available')
  return {
    paused: Boolean(row.paused),
    updatedAt: row.updatedAt,
    operator:
      row.githubId !== null && row.login !== null
        ? { githubId: row.githubId, login: row.login }
        : null,
  }
}

export async function changeSignupPause(
  db: D1Database,
  paused: boolean,
  operatorId: string,
  now: number,
) {
  await db
    .prepare(
      'UPDATE signup_settings SET paused = ?1, updated_at = ?2, updated_by_user_id = ?3 WHERE id = 1 AND paused != ?1',
    )
    .bind(paused ? 1 : 0, now, operatorId)
    .run()
  return readSignupPause(db)
}
