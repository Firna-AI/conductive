import { workspaceTokenAccessPredicate } from '../data/workspace-token-access'

interface MachineCredentialAccess {
  senderSuspendedAt: number | null
  memberUserId: string | null
}

export function readMachineCredentialAccess(
  db: D1Database,
  input: {
    workspaceId: string
    orgId: string
    tokenHash: string
    senderId: string
  },
): Promise<MachineCredentialAccess | null> {
  return db
    .prepare(
      `SELECT sender.suspended_at AS senderSuspendedAt, member.user_id AS memberUserId
       FROM workspace_tokens t JOIN workspaces w ON w.id = t.workspace_id
       LEFT JOIN users sender ON sender.id = ?
       LEFT JOIN org_members member ON member.user_id = sender.id AND member.org_id = w.org_id
       WHERE w.id = ? AND w.org_id = ? AND t.token_hash = ?
         AND ${workspaceTokenAccessPredicate}`,
    )
    .bind(input.senderId, input.workspaceId, input.orgId, input.tokenHash)
    .first<MachineCredentialAccess>()
}
