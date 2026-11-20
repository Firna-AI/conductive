import type { UpdateWorkspaceCapabilitiesRequest } from '../../src/shared/secrets'
import { secretMemberPredicate } from './access'

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
): Promise<void> {
  const { orgId, workspaceId, userId, now, change } = input
  const statements: D1PreparedStatement[] = []
  if (change.macAccess !== undefined)
    statements.push(
      db
        .prepare(
          `UPDATE workspaces SET mac_access = ?, mac_access_period = mac_access_period + ?
           WHERE org_id = ? AND id = ? AND ${secretMemberPredicate}`,
        )
        .bind(
          Number(change.macAccess),
          Number(!change.macAccess),
          orgId,
          workspaceId,
          orgId,
          userId,
        ),
    )
  if (change.preapprovedSecretIds !== undefined) {
    statements.push(
      db
        .prepare(
          `DELETE FROM workspace_secret_preapprovals WHERE org_id = ? AND workspace_id = ?
       AND secret_id NOT IN (SELECT value FROM json_each(?)) AND ${secretMemberPredicate}`,
        )
        .bind(
          orgId,
          workspaceId,
          JSON.stringify(change.preapprovedSecretIds),
          orgId,
          userId,
        ),
    )
    statements.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO workspace_secret_preapprovals
         (org_id, workspace_id, secret_id, approved_by_user_id, approved_at)
       SELECT org_id, ?, id, ?, ? FROM org_secrets
       WHERE org_id = ? AND id IN (SELECT value FROM json_each(?)) AND ${secretMemberPredicate}`,
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
  for (const removal of change.removeSessionApprovals ?? [])
    statements.push(
      db
        .prepare(
          `DELETE FROM session_secret_approvals WHERE org_id = ? AND workspace_id = ?
     AND session_id = ? AND secret_id = ? AND ${secretMemberPredicate}`,
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
  if (statements.length) await db.batch(statements)
}
