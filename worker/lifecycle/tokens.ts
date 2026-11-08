import { activeWorkspaceOwnerPredicate } from '../data/sandbox-access'
import { requireActiveOrg } from '../data/user-access'
import type { AppEnv } from '../env'
import { workspaceTokenAccessPredicate } from '../data/workspace-token-access'
import { HttpError } from '../http'
import { decrypt, encrypt, hash } from '../security/crypto'

interface StoredToken {
  ciphertext: string
}

function tokenContext(workspaceId: string): string {
  return JSON.stringify(['workspace-token', workspaceId])
}

export async function ensureWorkspaceToken(
  env: AppEnv,
  workspaceId: string,
  randomToken: () => string,
  now: number,
): Promise<void> {
  const existing = await env.DB.prepare(
    'SELECT workspace_id FROM workspace_tokens WHERE workspace_id = ? AND revoked_at IS NULL',
  )
    .bind(workspaceId)
    .first()
  if (!existing) await storeWorkspaceToken(env, workspaceId, randomToken(), now)
}

export async function storeWorkspaceToken(
  env: AppEnv,
  workspaceId: string,
  token: string,
  now: number,
): Promise<void> {
  const workspace = await env.DB.prepare(
    'SELECT org_id AS orgId FROM workspaces WHERE id = ?',
  )
    .bind(workspaceId)
    .first<{ orgId: string }>()
  if (workspace) await requireActiveOrg(env.DB, workspace.orgId)
  const ciphertext = await encrypt(
    token,
    tokenContext(workspaceId),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await env.DB.prepare(
    `INSERT INTO workspace_tokens
       (workspace_id, token_hash, ciphertext, created_at)
     SELECT ?, ?, ?, ? FROM workspaces w WHERE w.id = ? AND ${activeWorkspaceOwnerPredicate}
     ON CONFLICT(workspace_id) DO UPDATE SET token_hash = excluded.token_hash,
       ciphertext = excluded.ciphertext, created_at = excluded.created_at, revoked_at = NULL
     WHERE workspace_tokens.revoked_at IS NOT NULL`,
  )
    .bind(workspaceId, await hash(token), ciphertext, now, workspaceId)
    .run()
  if (workspace) await requireActiveOrg(env.DB, workspace.orgId)
}

export async function readWorkspaceToken(
  env: AppEnv,
  workspaceId: string,
): Promise<string> {
  const row = await env.DB.prepare(
    `SELECT ciphertext FROM workspace_tokens
     WHERE workspace_id = ? AND revoked_at IS NULL`,
  )
    .bind(workspaceId)
    .first<StoredToken>()
  if (!row) {
    throw new HttpError(
      409,
      'workspace_token_unavailable',
      'The cloud computer cannot start. Try again.',
    )
  }
  return decrypt(
    row.ciphertext,
    tokenContext(workspaceId),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
}

export async function authenticateWorkspaceToken(
  env: AppEnv,
  token: string,
): Promise<{ workspaceId: string; orgId: string }> {
  const row = await env.DB.prepare(
    `SELECT w.id AS workspaceId, w.org_id AS orgId
     FROM workspace_tokens t JOIN workspaces w ON w.id = t.workspace_id
     WHERE t.token_hash = ? AND ${workspaceTokenAccessPredicate}`,
  )
    .bind(await hash(token))
    .first<{ workspaceId: string; orgId: string }>()
  if (!row) throw workspaceTokenRefusedError()
  return row
}

export function workspaceTokenRefusedError(): HttpError {
  return new HttpError(
    401,
    'workspace_token_refused',
    'The workspace token is not valid.',
  )
}

export async function revokeWorkspaceToken(
  db: D1Database,
  workspaceId: string,
  now: number,
): Promise<void> {
  await db
    .prepare(
      'UPDATE workspace_tokens SET revoked_at = ? WHERE workspace_id = ?',
    )
    .bind(now, workspaceId)
    .run()
}
