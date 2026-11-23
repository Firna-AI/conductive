import type {
  SessionSecretApproval,
  WorkspaceCapabilitiesResponse,
} from '../../src/shared/secrets'
import { HttpError } from '../http'

export async function readWorkspaceCapabilities(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<WorkspaceCapabilitiesResponse['capabilities']> {
  const row = await db
    .prepare(
      'SELECT mac_access AS macAccess FROM workspaces WHERE org_id = ? AND id = ?',
    )
    .bind(orgId, workspaceId)
    .first<{ macAccess: number }>()
  if (!row)
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  const preapprovals = await db
    .prepare(
      'SELECT secret_id AS secretId FROM workspace_secret_preapprovals WHERE org_id = ? AND workspace_id = ? ORDER BY secret_id',
    )
    .bind(orgId, workspaceId)
    .all<{ secretId: string }>()
  const sessions = await db
    .prepare(
      `SELECT a.secret_id AS secretId, a.session_id AS sessionId,
       a.approved_by_user_id AS approvedByUserId, a.approved_at AS approvedAt,
       u.github_login AS githubLogin, u.display_name AS displayName, u.avatar_url AS avatarUrl
     FROM session_secret_approvals a LEFT JOIN users u ON u.id = a.approved_by_user_id
     WHERE a.org_id = ? AND a.workspace_id = ? ORDER BY a.session_id, a.secret_id`,
    )
    .bind(orgId, workspaceId)
    .all<
      Omit<SessionSecretApproval, 'approvedBy'> & {
        githubLogin: string | null
        displayName: string | null
        avatarUrl: string | null
      }
    >()
  return {
    macAccess: row.macAccess === 1,
    preapprovedSecretIds: preapprovals.results.map(({ secretId }) => secretId),
    sessionApprovals: sessions.results.map((item) => ({
      secretId: item.secretId,
      sessionId: item.sessionId,
      approvedByUserId: item.approvedByUserId,
      approvedAt: item.approvedAt,
      approvedBy:
        item.githubLogin === null
          ? null
          : {
              id: item.approvedByUserId,
              githubLogin: item.githubLogin,
              displayName: item.displayName,
              avatarUrl: item.avatarUrl,
            },
    })),
  }
}

export async function requireOrgSecrets(
  db: D1Database,
  orgId: string,
  ids: readonly string[],
): Promise<void> {
  const count = await db
    .prepare(
      'SELECT COUNT(*) AS count FROM org_secrets WHERE org_id = ? AND id IN (SELECT value FROM json_each(?))',
    )
    .bind(orgId, JSON.stringify([...new Set(ids)]))
    .first<number>('count')
  if (count !== new Set(ids).size)
    throw new HttpError(404, 'secret_not_found', 'The secret is not available.')
}
