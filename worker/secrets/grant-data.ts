import type { SecretGrant } from '../../src/shared/generated/SecretGrant'

import { secretMemberPredicate } from './access'

export interface GrantedSecret {
  id: string
  name: string
  description: string
  grant: SecretGrant | null
}

export async function secretGrants(
  db: D1Database,
  orgId: string,
  workspaceId: string,
  sessionId: string | null,
) {
  const { results } = await db
    .prepare(
      `SELECT s.id, s.name, s.description,
    CASE WHEN s.all_agents = 1 THEN 'all-agents'
      WHEN p.secret_id IS NOT NULL THEN 'workspace'
      WHEN a.secret_id IS NOT NULL THEN 'session' ELSE NULL END AS grant
    FROM org_secrets s
    LEFT JOIN workspace_secret_preapprovals p ON p.org_id = s.org_id AND p.secret_id = s.id AND p.workspace_id = ?
    LEFT JOIN session_secret_approvals a ON a.org_id = s.org_id AND a.secret_id = s.id AND a.workspace_id = ? AND a.session_id = ?
    WHERE s.org_id = ? ORDER BY s.name, s.id`,
    )
    .bind(workspaceId, workspaceId, sessionId, orgId)
    .all<GrantedSecret>()
  return results
}

export async function secretCiphertexts(
  db: D1Database,
  orgId: string,
  ids: readonly string[],
) {
  return (
    await db
      .prepare(
        `SELECT id, name, value_ciphertext AS ciphertext FROM org_secrets
    WHERE org_id = ? AND id IN (SELECT value FROM json_each(?))`,
      )
      .bind(orgId, JSON.stringify(ids))
      .all<{ id: string; name: string; ciphertext: string }>()
  ).results
}

export function sessionApproval(
  db: D1Database,
  input: {
    orgId: string
    workspaceId: string
    sessionId: string
    secretId: string
    userId: string
    now: number
  },
) {
  return db
    .prepare(
      `INSERT INTO session_secret_approvals
    (org_id, workspace_id, session_id, secret_id, approved_by_user_id, approved_at)
    SELECT org_id, ?, ?, id, ?, ? FROM org_secrets
    WHERE org_id = ? AND id = ? AND ${secretMemberPredicate}
    ON CONFLICT (workspace_id, session_id, secret_id) DO UPDATE SET
      approved_by_user_id = excluded.approved_by_user_id, approved_at = excluded.approved_at`,
    )
    .bind(
      input.workspaceId,
      input.sessionId,
      input.userId,
      input.now,
      input.orgId,
      input.secretId,
      input.orgId,
      input.userId,
    )
}

export async function secretWorkspaceState(
  db: D1Database,
  workspaceId: string,
) {
  return db
    .prepare(
      `SELECT w.org_id AS orgId, w.archived_at AS archivedAt,
    o.suspended_at AS orgSuspendedAt, owner.suspended_at AS ownerSuspendedAt
    FROM workspaces w JOIN orgs o ON o.id = w.org_id JOIN users owner ON owner.id = w.owner_user_id
    WHERE w.id = ?`,
    )
    .bind(workspaceId)
    .first<{
      orgId: string
      archivedAt: number | null
      orgSuspendedAt: number | null
      ownerSuspendedAt: number | null
    }>()
}
