import { agentLoginContext } from '../chat/queries'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { decrypt } from '../security/crypto'
import type { CodexAuthDependencies } from './oauth'
import { readCodexConnection } from './token-store'
import {
  CODEX_RECONNECT_CAUSE,
  parseCodexTokens,
  type CodexTokens,
} from './tokens'

const WAIT_MS = 5000
const POLL_MS = 100

export type CodexRotation =
  | { state: 'rotated'; tokens: CodexTokens }
  | { state: 'unchanged' }
  | { state: 'pending' }

/** Observe the winning recovery without taking a second refresh claim. */
export async function waitForCodexRotation(
  env: AppEnv,
  userId: string,
  failedAccessToken: string,
  dependencies: CodexAuthDependencies,
  recoveryPending: () => Promise<boolean>,
): Promise<CodexRotation> {
  const wait =
    dependencies.wait ??
    ((milliseconds) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  const deadline = dependencies.now() + WAIT_MS
  for (let poll = 0; poll <= WAIT_MS / POLL_MS; poll++) {
    const recoveryInProgress = await recoveryPending()
    const connection = await readCodexConnection(env.DB, userId)
    if (!connection || connection.failureCause !== null)
      throw new HttpError(
        401,
        'codex_reconnect_required',
        CODEX_RECONNECT_CAUSE,
      )
    const stored = parseCodexTokens(
      await decrypt(
        connection.ciphertext,
        agentLoginContext(userId, 'codex'),
        env.BOAT_KEY_ENCRYPTION_KEY,
      ),
    )
    if (!stored)
      throw new HttpError(
        401,
        'codex_reconnect_required',
        CODEX_RECONNECT_CAUSE,
      )
    if (
      connection.refreshClaim === null &&
      stored.accessToken !== failedAccessToken
    )
      return { state: 'rotated', tokens: stored }
    const pending = connection.refreshClaim !== null || recoveryInProgress
    if (!pending) return { state: 'unchanged' }
    const remaining = deadline - dependencies.now()
    if (remaining <= 0 || poll === WAIT_MS / POLL_MS)
      return { state: 'pending' }
    await wait(Math.min(POLL_MS, remaining))
  }
  return { state: 'pending' }
}
