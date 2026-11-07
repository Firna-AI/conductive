import type { AppEnv } from '../env'
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
    'SELECT workspace_id FROM workspace_tokens WHERE workspace_id = ?',
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
  const ciphertext = await encrypt(
    token,
    tokenContext(workspaceId),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  await env.DB.prepare(
    `INSERT INTO workspace_tokens
       (workspace_id, token_hash, ciphertext, created_at) VALUES (?, ?, ?, ?)`,
  )
    .bind(workspaceId, await hash(token), ciphertext, now)
    .run()
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
    `SELECT workspaces.id AS workspaceId, workspaces.org_id AS orgId
     FROM workspace_tokens JOIN workspaces
       ON workspaces.id = workspace_tokens.workspace_id
     JOIN orgs ON orgs.id = workspaces.org_id
     WHERE token_hash = ? AND revoked_at IS NULL
       AND workspaces.archived_at IS NULL AND orgs.deleted_at IS NULL`,
  )
    .bind(await hash(token))
    .first<{ workspaceId: string; orgId: string }>()
  if (!row) {
    throw new HttpError(
      401,
      'workspace_token_refused',
      'The workspace token is not valid.',
    )
  }
  return row
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
