import type { AppEnv } from '../env'
import { decrypt, encrypt, randomToken } from '../security/crypto'

function context(workspaceId: string): string {
  return JSON.stringify(['terminal-password', workspaceId])
}

/** A saved image never gets this password. The sandbox receives it in /run only. */
export async function terminalPassword(
  env: AppEnv,
  workspaceId: string,
  now?: number,
): Promise<string | null> {
  if (now !== undefined) {
    const ciphertext = await encrypt(
      randomToken(),
      context(workspaceId),
      env.BOAT_KEY_ENCRYPTION_KEY,
    )
    await env.DB.prepare(
      'INSERT INTO terminal_credentials (workspace_id, ciphertext, updated_at) VALUES (?, ?, ?) ON CONFLICT (workspace_id) DO NOTHING',
    )
      .bind(workspaceId, ciphertext, now)
      .run()
  }
  const row = await env.DB.prepare(
    'SELECT ciphertext FROM terminal_credentials WHERE workspace_id = ?',
  )
    .bind(workspaceId)
    .first<{ ciphertext: string }>()
  return row
    ? decrypt(row.ciphertext, context(workspaceId), env.BOAT_KEY_ENCRYPTION_KEY)
    : null
}
