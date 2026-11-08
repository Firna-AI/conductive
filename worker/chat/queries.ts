import type { Agent } from '../../src/shared/agents'
import type { RunnerLogin } from '../../src/shared/runner'
import type { AppEnv } from '../env'
import {
  workspaceTokenAccessPredicate,
  workspaceTokenResourcePredicate,
} from '../data/workspace-token-access'
import { decrypt, hash } from '../security/crypto'
import { agentLoginKind } from './login-kind'
import type { RunnerWorkspaceRecord, WorkspaceRecord } from './types'

const workspaceColumns = `w.id, w.org_id AS orgId, w.archived_at AS archivedAt`

export function findChatWorkspace(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<WorkspaceRecord | null> {
  return db
    .prepare(
      `SELECT ${workspaceColumns} FROM workspaces w
     JOIN orgs ON orgs.id = w.org_id
     WHERE w.id = ? AND w.org_id = ? AND orgs.deleted_at IS NULL`,
    )
    .bind(workspaceId, orgId)
    .first<WorkspaceRecord>()
}

export async function updateWorkspaceTitle(
  db: D1Database,
  workspaceId: string,
  name: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      `UPDATE workspaces SET name = ?, updated_at = ?
    WHERE id = ? AND archived_at IS NULL AND EXISTS
    (SELECT 1 FROM orgs WHERE orgs.id = workspaces.org_id AND orgs.deleted_at IS NULL)`,
    )
    .bind(name, now, workspaceId)
    .run()
}

export async function tokenWorkspace(
  db: D1Database,
  token: string,
): Promise<RunnerWorkspaceRecord | null> {
  return db
    .prepare(
      `SELECT ${workspaceColumns}, t.token_hash AS tokenHash FROM workspace_tokens t
     JOIN workspaces w ON w.id = t.workspace_id
     WHERE t.token_hash = ? AND ${workspaceTokenAccessPredicate}`,
    )
    .bind(await hash(token))
    .first<RunnerWorkspaceRecord>()
}

/** The account-login writer must use this authenticated encryption context. */
export function agentLoginContext(userId: string, agent: Agent): string {
  return `agent-login:${userId}:${agent}`
}

/**
 * A login never holds whitespace. A token that a terminal wrapped can arrive
 * with a space or a line break inside it, so each save and read removes them.
 */
export function loginSecret(value: string): string {
  return value.replace(/\s+/g, '')
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
  const loginKind = row ? agentLoginKind(agent, row.kind) : null
  if (!row || !loginKind) return null
  const secret = await decrypt(
    row.ciphertext,
    agentLoginContext(userId, agent),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  return { ...loginKind, secret: loginSecret(secret) }
}

export async function senderLoginAccess(
  db: D1Database,
  workspaceId: string,
  loginOwnerId: string | null,
  runnerTokenHash?: string,
  senderId?: string,
): Promise<{
  senderAllowed: boolean
  loginOwnerAllowed: boolean
  runnerAllowed: boolean
}> {
  const row = await db
    .prepare(
      `SELECT
       CASE WHEN ${workspaceTokenResourcePredicate} THEN 1 ELSE 0 END AS workspaceAllowed,
       EXISTS(SELECT 1 FROM org_members JOIN users sender ON sender.id = org_members.user_id
         WHERE org_id = w.org_id AND user_id = ? AND sender.suspended_at IS NULL) AS senderAllowed,
       EXISTS(SELECT 1 FROM org_members JOIN users login_owner ON login_owner.id = org_members.user_id
         WHERE org_id = w.org_id AND user_id = ? AND login_owner.suspended_at IS NULL) AS loginOwnerAllowed,
       EXISTS(SELECT 1 FROM workspace_tokens t WHERE t.workspace_id = w.id
         AND t.token_hash = ? AND ${workspaceTokenAccessPredicate}) AS runnerAllowed
     FROM workspaces w WHERE w.id = ?`,
    )
    .bind(
      senderId ?? loginOwnerId,
      loginOwnerId,
      runnerTokenHash ?? null,
      workspaceId,
    )
    .first<{
      workspaceAllowed: number
      senderAllowed: number
      loginOwnerAllowed: number
      runnerAllowed: number
    }>()
  return {
    senderAllowed: row?.workspaceAllowed === 1 && row.senderAllowed === 1,
    loginOwnerAllowed:
      row?.workspaceAllowed === 1 && row.loginOwnerAllowed === 1,
    runnerAllowed: row?.workspaceAllowed === 1 && row.runnerAllowed === 1,
  }
}
