import type {
  OperatorUsersResponse,
  OperatorUserSummary,
} from '../../src/shared/operator'
import {
  directoryCursor,
  directoryPage,
  namePattern,
  numericGitHubId,
} from './directory'

const matches = `FROM users u WHERE (?1 = ''
  OR u.github_login LIKE ?2 ESCAPE '\\' OR u.display_name LIKE ?2 ESCAPE '\\'
  OR u.github_id = ?3)`

export async function readOperatorUsers(
  db: D1Database,
  params: URLSearchParams,
): Promise<OperatorUsersResponse> {
  const query = params.get('q')?.trim() ?? ''
  const cursor = directoryCursor(params.get('cursor'))
  const values = [query, namePattern(query), numericGitHubId(query)]
  const [count, page] = await db.batch<{ total: number } | OperatorUserSummary>(
    [
      db.prepare(`SELECT COUNT(*) AS total ${matches}`).bind(...values),
      db
        .prepare(
          `SELECT u.github_id AS githubId, u.github_login AS login,
           u.display_name AS name, u.created_at AS joinedAt,
           (SELECT COUNT(*) FROM org_members m WHERE m.user_id = u.id) AS orgs,
           (SELECT COUNT(*) FROM workspaces w WHERE w.owner_user_id = u.id) AS workspaces,
           CASE WHEN u.suspended_at IS NULL THEN 'active' ELSE 'suspended' END AS status
         ${matches}
         AND (?4 IS NULL OR u.created_at < ?4 OR (u.created_at = ?4 AND u.github_id > ?5))
         ORDER BY u.created_at DESC, u.github_id LIMIT 21`,
        )
        .bind(...values, cursor?.createdAt ?? null, cursor?.id ?? null),
    ],
  )
  const total = count.results[0]
  if (!total || !('total' in total))
    throw new Error('Invalid operator user count')
  const rows = page.results.map((row) => {
    if (!('githubId' in row)) throw new Error('Invalid operator user row')
    return row
  })
  const { entries: users, nextCursor } = directoryPage(rows, (row) => ({
    createdAt: row.joinedAt,
    id: row.githubId,
  }))
  return { users, total: total.total, nextCursor }
}
