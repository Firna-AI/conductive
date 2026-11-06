import type { AppEnv } from '../env'
import { decrypt, encrypt } from '../security/crypto'
import { readTerminalCredential, saveTerminalCredential } from './store'
import type { WorkspaceTarget } from '../previews/types'
import { HttpError } from '../http'

function context(workspaceId: string): string {
  return JSON.stringify(['terminal-password', workspaceId])
}

/** Only the service's locally generated password enters this encrypted cache. */
export async function cacheTerminalPassword(
  env: AppEnv,
  target: WorkspaceTarget,
  password: string,
  now: number,
): Promise<void> {
  const ciphertext = await encrypt(
    password,
    context(target.workspaceId),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
  if (!(await saveTerminalCredential(env.DB, target, ciphertext, now))) {
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
}

export async function terminalPassword(
  env: AppEnv,
  workspaceId: string,
  sandboxId: string | null,
): Promise<string | null> {
  const row = await readTerminalCredential(env.DB, workspaceId, sandboxId)
  return row
    ? decrypt(row.ciphertext, context(workspaceId), env.BOAT_KEY_ENCRYPTION_KEY)
    : null
}
