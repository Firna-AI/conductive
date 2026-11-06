import type { Agent } from '../../src/shared/agents'
import type { RunnerLogin } from '../../src/shared/runner'
import type { AppEnv } from '../env'
import { decrypt, hash } from '../security/crypto'
import type { WorkspaceRecord } from './types'

const workspaceColumns = `workspaces.id, workspaces.org_id AS orgId,
  workspaces.archived_at AS archivedAt`

export function findChatWorkspace(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<WorkspaceRecord | null> {
  return db
    .prepare(
      `SELECT ${workspaceColumns} FROM workspaces
     JOIN orgs ON orgs.id = workspaces.org_id
     WHERE workspaces.id = ? AND workspaces.org_id = ? AND orgs.deleted_at IS NULL`,
    )
    .bind(workspaceId, orgId)
    .first<WorkspaceRecord>()
}

export async function tokenWorkspace(
  db: D1Database,
  token: string,
): Promise<WorkspaceRecord | null> {
  return db
    .prepare(
      `SELECT ${workspaceColumns} FROM workspace_tokens
     JOIN workspaces ON workspaces.id = workspace_tokens.workspace_id
     JOIN orgs ON orgs.id = workspaces.org_id
     WHERE workspace_tokens.token_hash = ? AND workspace_tokens.revoked_at IS NULL
       AND orgs.deleted_at IS NULL AND workspaces.archived_at IS NULL`,
    )
    .bind(await hash(token))
    .first<WorkspaceRecord>()
}

/** The account-login writer must use this authenticated encryption context. */
export function agentLoginContext(userId: string, agent: Agent): string {
  return `agent-login:${userId}:${agent}`
}

export async function readAgentLogin(
  env: AppEnv,
  userId: string,
  agent: Agent,
): Promise<RunnerLogin | null> {
  const row = await env.DB.prepare(
    'SELECT kind, ciphertext FROM agent_logins WHERE user_id = ? AND agent = ?',
  )
    .bind(userId, agent)
    .first<{ kind: string; ciphertext: string }>()
  if (!row) return null
  const secret = await decrypt(
    row.ciphertext,
    agentLoginContext(userId, agent),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  if (agent === 'codex' && row.kind === 'api-key') {
    return { agent, kind: 'api-key', secret }
  }
  if (agent === 'claude' && (row.kind === 'token' || row.kind === 'api-key')) {
    return { agent, kind: row.kind, secret }
  }
  return null
}

export async function senderIsMember(
  db: D1Database,
  workspaceId: string,
  senderId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM org_members JOIN workspaces ON workspaces.org_id = org_members.org_id
     JOIN orgs ON orgs.id = workspaces.org_id
     WHERE workspaces.id = ? AND org_members.user_id = ?
       AND orgs.deleted_at IS NULL AND workspaces.archived_at IS NULL`,
    )
    .bind(workspaceId, senderId)
    .first()
  return row !== null
}
