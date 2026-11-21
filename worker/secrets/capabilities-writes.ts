import type { UpdateWorkspaceCapabilitiesRequest } from '../../src/shared/secrets'
import { secretMemberPredicate } from './access'

export interface CapabilityWrite {
  kind:
    | 'pre-approved'
    | 'pre-approval-removed'
    | 'session-approval-removed'
    | 'mac-access'
  names: string[]
  sessionId?: string
  on?: boolean
}

export function creationPreapprovals(
  db: D1Database,
  input: {
    orgId: string
    workspaceId: string
    secretIds: readonly string[]
    userId: string
    now: number
  },
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT OR IGNORE INTO workspace_secret_preapprovals
       (org_id, workspace_id, secret_id, approved_by_user_id, approved_at)
     SELECT s.org_id, w.id, s.id, ?, ? FROM org_secrets s
     JOIN workspaces w ON w.org_id = s.org_id AND w.id = ?
     WHERE s.org_id = ? AND s.id IN (SELECT value FROM json_each(?))`,
    )
    .bind(
      input.userId,
      input.now,
      input.workspaceId,
      input.orgId,
      JSON.stringify(input.secretIds),
    )
}

export async function updateWorkspaceCapabilities(
  db: D1Database,
  input: {
    orgId: string
    workspaceId: string
    userId: string
    now: number
    change: UpdateWorkspaceCapabilitiesRequest
  },
): Promise<CapabilityWrite[]> {
  const { orgId, workspaceId, userId, now, change } = input
  const statements: D1PreparedStatement[] = []
  const kinds: CapabilityWrite['kind'][] = []
  if (change.macAccess !== undefined) {
    kinds.push('mac-access')
    statements.push(
      db
        .prepare(
          `UPDATE workspaces SET mac_access = ? WHERE org_id = ? AND id = ? AND ${secretMemberPredicate}
           AND mac_access != ? RETURNING mac_access AS macAccess`,
        )
        .bind(
          Number(change.macAccess),
          orgId,
          workspaceId,
          orgId,
          userId,
          Number(change.macAccess),
        ),
    )
  }
  if (change.preapprovedSecretIds !== undefined) {
    kinds.push('pre-approval-removed')
    statements.push(
      db
        .prepare(
          `DELETE FROM workspace_secret_preapprovals WHERE org_id = ? AND workspace_id = ?
       AND secret_id NOT IN (SELECT value FROM json_each(?)) AND ${secretMemberPredicate}
       RETURNING (SELECT name FROM org_secrets WHERE id = workspace_secret_preapprovals.secret_id) AS name`,
        )
        .bind(
          orgId,
          workspaceId,
          JSON.stringify(change.preapprovedSecretIds),
          orgId,
          userId,
        ),
    )
    kinds.push('pre-approved')
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO workspace_secret_preapprovals
         (org_id, workspace_id, secret_id, approved_by_user_id, approved_at)
       SELECT org_id, ?, id, ?, ? FROM org_secrets
       WHERE org_id = ? AND id IN (SELECT value FROM json_each(?)) AND ${secretMemberPredicate}
       RETURNING (SELECT name FROM org_secrets WHERE id = workspace_secret_preapprovals.secret_id) AS name`,
        )
        .bind(
          workspaceId,
          userId,
          now,
          orgId,
          JSON.stringify(change.preapprovedSecretIds),
          orgId,
          userId,
        ),
    )
  }
  for (const removal of change.removeSessionApprovals ?? []) {
    kinds.push('session-approval-removed')
    statements.push(
      db
        .prepare(
          `DELETE FROM session_secret_approvals WHERE org_id = ? AND workspace_id = ?
     AND session_id = ? AND secret_id = ? AND ${secretMemberPredicate}
     RETURNING session_id AS sessionId,
       (SELECT name FROM org_secrets WHERE id = session_secret_approvals.secret_id) AS name`,
        )
        .bind(
          orgId,
          workspaceId,
          removal.sessionId,
          removal.secretId,
          orgId,
          userId,
        ),
    )
  }
  if (!statements.length) return []
  const results = await db.batch<{
    name: string
    sessionId?: string
    macAccess?: number
  }>(statements)
  return results.flatMap((result, index) =>
    result.results.map((row) => ({
      kind: kinds[index],
      names: row.name ? [row.name] : [],
      ...(row.sessionId ? { sessionId: row.sessionId } : {}),
      ...(row.macAccess === undefined ? {} : { on: row.macAccess === 1 }),
    })),
  )
}
