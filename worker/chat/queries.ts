import type { SessionLogin } from '../../src/shared/generated/SessionLogin'
import type { Agent } from '../../src/shared/generated/Agent'
import type { AppEnv } from '../env'
import { CODEX_RECONNECT_CAUSE, parseCodexTokens } from '../codex-auth/tokens'
import { failCodexRefresh } from '../codex-auth/token-store'
import { workspaceTokenAccessPredicate } from '../data/workspace-token-access'
import { decrypt, hash } from '../security/crypto'
import { workspaceNameColumn } from '../data/workspace-name'
import { namedBranchSql } from '../lifecycle/workspace-branch'
import {
  agentLoginKind,
  type AgentLogin,
  type AgentLoginKind,
} from './login-kind'
import type { RunnerWorkspaceRecord, WorkspaceRecord } from './types'

const workspaceColumns = `w.id, w.org_id AS orgId, w.archived_at AS archivedAt`

const automaticTitleWorkspacePredicate = `archived_at IS NULL AND state != 'archived'
  AND EXISTS (SELECT 1 FROM orgs WHERE orgs.id = workspaces.org_id
    AND orgs.deleted_at IS NULL AND orgs.suspended_at IS NULL)`

export async function readAutomaticTitleWorkspace(
  db: D1Database,
  workspaceId: string,
): Promise<{ name: string | null } | null> {
  return db
    .prepare(
      `SELECT ${workspaceNameColumn('workspaces')} FROM workspaces WHERE id = ? AND ${automaticTitleWorkspacePredicate}`,
    )
    .bind(workspaceId)
    .first<{ name: string | null }>()
}

export function findChatWorkspace(
  db: D1Database,
  orgId: string,
  workspaceId: string,
): Promise<(WorkspaceRecord & { number: number }) | null> {
  return db
    .prepare(
      `SELECT ${workspaceColumns}, w.number FROM workspaces w
     JOIN orgs ON orgs.id = w.org_id
     WHERE w.id = ? AND w.org_id = ? AND orgs.deleted_at IS NULL`,
    )
    .bind(workspaceId, orgId)
    .first<WorkspaceRecord & { number: number }>()
}

/**
 * Stores the automatic title. While the branch is a placeholder, the branch
 * takes the title too, and the reply gives the org of the workspace.
 */
export async function updateWorkspaceTitle(
  db: D1Database,
  workspaceId: string,
  name: string,
  now: number,
): Promise<{ branchOrgId: string | null }> {
  const branch = namedBranchSql(name)
  const row = await db
    .prepare(
      `UPDATE workspaces SET name = ?, branch = ${branch.sql}, updated_at = MAX(updated_at, ?)
    WHERE id = ? AND name = '' AND ${automaticTitleWorkspacePredicate}
    RETURNING org_id AS orgId, branch_placeholder AS placeholder`,
    )
    .bind(name, ...branch.values, now, workspaceId)
    .first<{ orgId: string; placeholder: number }>()
  return { branchOrgId: row?.placeholder === 1 ? row.orgId : null }
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

export type AgentLoginOwner = string | { orgId: string }

/** A string names a personal owner and keeps the stored account context. */
export function agentLoginContext(
  owner: AgentLoginOwner,
  agent: Agent,
): string {
  return typeof owner === 'string'
    ? `agent-login:${owner}:${agent}`
    : `org-agent-login:${owner.orgId}:${agent}`
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
): Promise<AgentLogin | null> {
  const row = await env.DB.prepare(
    'SELECT kind, ciphertext FROM agent_logins WHERE user_id = ? AND agent = ? AND failure_cause IS NULL',
  )
    .bind(userId, agent)
    .first<{ kind: string; ciphertext: string }>()
  const loginKind = row ? agentLoginKind(agent, row.kind) : null
  if (!row || !loginKind) return null
  const login = await decryptAgentLogin(env, userId, loginKind, row.ciphertext)
  if (
    login?.agent === 'codex' &&
    login.kind === 'token' &&
    !parseCodexTokens(login.secret)
  ) {
    await failCodexRefresh(
      env.DB,
      userId,
      row.ciphertext,
      null,
      CODEX_RECONNECT_CAUSE,
    )
    return null
  }
  return login
}

export async function decryptAgentLogin(
  env: AppEnv,
  owner: AgentLoginOwner,
  kind: AgentLoginKind,
  ciphertext: string,
): Promise<AgentLogin | null> {
  const plaintext = await decrypt(
    ciphertext,
    agentLoginContext(owner, kind.agent),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  if (kind.kind !== 'endpoint')
    return {
      ...kind,
      secret:
        kind.agent === 'codex' && kind.kind === 'token'
          ? plaintext
          : loginSecret(plaintext),
    }
  const value: unknown = JSON.parse(plaintext)
  if (
    !value ||
    typeof value !== 'object' ||
    !('endpoint' in value) ||
    typeof value.endpoint !== 'string' ||
    !('secret' in value) ||
    typeof value.secret !== 'string'
  )
    return null
  return {
    ...kind,
    endpoint: value.endpoint,
    secret: loginSecret(value.secret),
  }
}

/** The transcript captures the names of its workspace and org together. */
export function transcriptWorkspaceName(
  db: D1Database,
  workspaceId: string,
): Promise<{ name: string | null; orgName: string } | null> {
  return db
    .prepare(
      `SELECT ${workspaceNameColumn('w')}, o.name AS orgName
     FROM workspaces w JOIN orgs o ON o.id = w.org_id WHERE w.id = ?`,
    )
    .bind(workspaceId)
    .first<{ name: string | null; orgName: string }>()
}

/** Reads the credential of the explicit session owner. */
export async function readSessionLogin(
  env: AppEnv,
  login: SessionLogin,
  agent: Agent,
): Promise<AgentLogin | null> {
  if (login.type === 'personal') return readAgentLogin(env, login.userId, agent)
  const row = await env.DB.prepare(
    'SELECT kind, ciphertext FROM org_agent_logins WHERE org_id = ? AND agent = ?',
  )
    .bind(login.orgId, agent)
    .first<{ kind: string; ciphertext: string }>()
  if (!row || (row.kind !== 'api-key' && row.kind !== 'endpoint')) return null
  return decryptAgentLogin(
    env,
    { orgId: login.orgId },
    { agent, kind: row.kind },
    row.ciphertext,
  )
}
