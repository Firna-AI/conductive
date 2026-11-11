import { agentLoginContext } from '../chat/queries'
import type { AppEnv } from '../env'
import { decrypt } from '../security/crypto'
import { failCodexRefresh, readCodexConnection } from './token-store'
import { CODEX_RECONNECT_CAUSE, parseCodexTokens } from './tokens'

/** A late provider refusal must not sign out a replacement or rotated login. */
export async function failCodexAccessToken(
  env: AppEnv,
  userId: string,
  failedAccessToken: string,
): Promise<boolean> {
  const connection = await readCodexConnection(env.DB, userId)
  if (!connection || connection.refreshClaim !== null) return false
  if (connection.failureCause !== null) return true
  const stored = parseCodexTokens(
    await decrypt(
      connection.ciphertext,
      agentLoginContext(userId, 'codex'),
      env.BOAT_KEY_ENCRYPTION_KEY,
    ),
  )
  if (stored?.accessToken !== failedAccessToken) return false
  return failCodexRefresh(
    env.DB,
    userId,
    connection.ciphertext,
    null,
    CODEX_RECONNECT_CAUSE,
  )
}
