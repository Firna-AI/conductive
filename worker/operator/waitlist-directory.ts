import type {
  OperatorWaitlistEntry,
  OperatorWaitlistResponse,
} from '../../src/shared/operator-waitlist'
import {
  directoryCursor,
  directoryPage,
  namePattern,
  numericGitHubId,
} from './directory'

const matches = `FROM users u WHERE u.suspended_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM user_app_access a WHERE a.user_id = u.id)
  AND (?1 = '' OR u.github_login LIKE ?2 ESCAPE '\\'
    OR u.display_name LIKE ?2 ESCAPE '\\' OR u.github_id = ?3)`

type WaitlistRow = Omit<OperatorWaitlistEntry, 'hasVerifiedEmail'> & {
  hasVerifiedEmail: number
}

export async function readOperatorWaitlist(
  db: D1Database,
  params: URLSearchParams,
): Promise<OperatorWaitlistResponse> {
  const query = params.get('q')?.trim() ?? ''
  const cursor = directoryCursor(params.get('cursor'))
  const values = [query, namePattern(query), numericGitHubId(query)]
  const [count, page] = await db.batch<{ total: number } | WaitlistRow>([
    db.prepare(`SELECT COUNT(*) AS total ${matches}`).bind(...values),
    db
      .prepare(
        `SELECT u.github_id AS githubId, u.github_login AS login,
         u.display_name AS name, u.created_at AS joinedAt, u.github_created_at AS githubCreatedAt,
         u.primary_verified_email IS NOT NULL AS hasVerifiedEmail ${matches}
       AND (?4 IS NULL OR u.created_at > ?4 OR (u.created_at = ?4 AND u.github_id > ?5))
       ORDER BY u.created_at, u.github_id LIMIT 21`,
      )
      .bind(...values, cursor?.createdAt ?? null, cursor?.id ?? null),
  ])
  const total = count.results[0]
  if (!total || !('total' in total)) throw new Error('Invalid waitlist count')
  const rows = page.results.map((row) => {
    if (!('githubId' in row)) throw new Error('Invalid waitlist row')
    return { ...row, hasVerifiedEmail: Boolean(row.hasVerifiedEmail) }
  })
  const { entries: users, nextCursor } = directoryPage(rows, (row) => ({
    createdAt: row.joinedAt,
    id: row.githubId,
  }))
  return { users, total: total.total, nextCursor }
}
