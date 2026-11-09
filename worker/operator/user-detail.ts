import type {
  OperatorUserDetail,
  OperatorUserOrg,
} from '../../src/shared/operator'
import { HttpError } from '../http'
import { suspensionNote, type SuspensionRow } from './suspension-note'
import { runningWorkspacePredicate } from './workspace-counts'
import { readOperatorUserAccess } from './user-access-data'

interface UserHeader extends SuspensionRow {
  userId: string
  githubId: number
  login: string
  name: string | null
  joinedAt: number
  owned: number
  running: number
}

export async function readOperatorUser(
  db: D1Database,
  githubId: number,
): Promise<OperatorUserDetail> {
  const [header, orgs] = await db.batch<UserHeader | OperatorUserOrg>([
    db
      .prepare(
        `SELECT u.id AS userId, u.github_id AS githubId, u.github_login AS login,
           u.display_name AS name, u.created_at AS joinedAt,
           (SELECT COUNT(*) FROM workspaces w WHERE w.owner_user_id = u.id) AS owned,
           (SELECT COUNT(*) FROM workspaces w WHERE w.owner_user_id = u.id
             AND ${runningWorkspacePredicate}) AS running,
           u.suspended_at AS suspendedAt, actor.github_id AS operatorGithubId,
           actor.github_login AS operatorLogin
         FROM users u LEFT JOIN users actor ON actor.id = u.suspended_by_user_id
         WHERE u.github_id = ?`,
      )
      .bind(githubId),
    db
      .prepare(
        `SELECT o.id, o.name, o.initials, m.role FROM org_members m
         JOIN orgs o ON o.id = m.org_id JOIN users u ON u.id = m.user_id
         WHERE u.github_id = ? ORDER BY o.name, o.id`,
      )
      .bind(githubId),
  ])
  const user = header.results[0]
  if (!user || !('githubId' in user))
    throw new HttpError(404, 'user_not_found', 'The account is not available.')
  const access = (await readOperatorUserAccess(db, [user.userId])).get(
    user.userId,
  )
  if (!access) throw new Error('The user app access is not available')
  return {
    ...access,
    githubId: user.githubId,
    login: user.login,
    name: user.name,
    joinedAt: user.joinedAt,
    workspaces: { total: user.owned, running: user.running },
    orgs: orgs.results.map((row) => {
      if (!('role' in row)) throw new Error('Invalid operator user org row')
      return row
    }),
    suspension: suspensionNote(user),
  }
}
