import type {
  OperatorOrgDetail,
  OperatorOrgMember,
  OperatorWorkspaceStates,
} from '../../src/shared/operator'
import { HttpError } from '../http'
import { suspensionNote, type SuspensionRow } from './suspension-note'
import { workspaceStateCounts } from './workspace-counts'

interface OrgHeader extends SuspensionRow {
  id: string
  name: string
  initials: string | null
  createdAt: number
  repositories: number
  builds: number
  deletedAt: number | null
  purgeAt: number | null
}
interface MemberRow extends Omit<OperatorOrgMember, 'suspended'> {
  suspendedAt: number | null
}

export async function readOperatorOrg(
  db: D1Database,
  orgId: string,
): Promise<OperatorOrgDetail> {
  const [header, counts, members] = await db.batch<
    OrgHeader | OperatorWorkspaceStates | MemberRow
  >([
    db
      .prepare(
        `SELECT o.id, o.name, o.initials, o.created_at AS createdAt,
           (SELECT COUNT(*) FROM repositories r WHERE r.org_id = o.id) AS repositories,
           (SELECT COUNT(*) FROM image_builds b JOIN image_build_jobs j ON j.build_id = b.id
             WHERE b.org_id = o.id AND j.phase != 'done') AS builds,
           o.suspended_at AS suspendedAt, actor.github_id AS operatorGithubId,
           actor.github_login AS operatorLogin, o.deleted_at AS deletedAt,
           o.purge_after AS purgeAt
         FROM orgs o LEFT JOIN users actor ON actor.id = o.suspended_by_user_id
         WHERE o.id = ?`,
      )
      .bind(orgId),
    db
      .prepare(
        `SELECT ${workspaceStateCounts} FROM workspaces w WHERE w.org_id = ?`,
      )
      .bind(orgId),
    db
      .prepare(
        `SELECT u.github_id AS githubId, u.github_login AS login,
           u.display_name AS name, m.role, u.suspended_at AS suspendedAt
         FROM org_members m JOIN users u ON u.id = m.user_id
         WHERE m.org_id = ? ORDER BY u.github_login, u.github_id`,
      )
      .bind(orgId),
  ])
  const org = header.results[0]
  if (!org || !('repositories' in org))
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  const workspaceStates = counts.results[0]
  if (!workspaceStates || !('archived' in workspaceStates))
    throw new Error('Invalid operator workspace counts')
  return {
    id: org.id,
    name: org.name,
    initials: org.initials,
    createdAt: org.createdAt,
    repositories: org.repositories,
    workspaceStates,
    running: { workspaces: workspaceStates.running, builds: org.builds },
    members: members.results.map((row) => {
      if (!('role' in row)) throw new Error('Invalid operator member row')
      return {
        githubId: row.githubId,
        login: row.login,
        name: row.name,
        role: row.role,
        suspended: row.suspendedAt !== null,
      }
    }),
    suspension: suspensionNote(org),
    deletion:
      org.deletedAt === null
        ? null
        : { deletedAt: org.deletedAt, purgeAt: org.purgeAt },
  }
}
