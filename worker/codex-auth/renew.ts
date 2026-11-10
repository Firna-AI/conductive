import { agentLoginContext } from '../chat/queries'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { decrypt, encrypt, randomToken } from '../security/crypto'
import { refreshCodexTokens, type CodexAuthDependencies } from './oauth'
import type { CodexTaskOwner } from './tasks'
import {
  claimCodexRefresh,
  failCodexRefresh,
  finishCodexRefresh,
  readCodexConnection,
} from './token-store'
import {
  CODEX_RECONNECT_CAUSE,
  parseCodexIdentity,
  parseCodexTokens,
  type CodexTokens,
} from './tokens'

const RENEW_BEFORE_MS = 60_000
const CLAIM_MS = 35_000
const POLL_MS = 100
const renewals = new WeakMap<D1Database, Map<string, Promise<CodexTokens>>>()

function reconnectRequired(): HttpError {
  return new HttpError(401, 'codex_reconnect_required', CODEX_RECONNECT_CAUSE)
}

function sameIdentity(previous: CodexTokens, fresh: CodexTokens): boolean {
  const before = parseCodexIdentity(previous.idToken)
  const after = parseCodexIdentity(fresh.idToken)
  return (
    fresh.accountId === previous.accountId &&
    before !== null &&
    after !== null &&
    (before.userId === null || before.userId === after.userId)
  )
}

async function renew(
  env: AppEnv,
  userId: string,
  dependencies: CodexAuthDependencies,
  failedAccessToken?: string,
): Promise<CodexTokens> {
  const wait =
    dependencies.wait ??
    ((milliseconds) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  for (let poll = 0; poll <= CLAIM_MS / POLL_MS; poll++) {
    const connection = await readCodexConnection(env.DB, userId)
    if (!connection || connection.failureCause !== null)
      throw reconnectRequired()
    const now = dependencies.now()
    if (connection.refreshClaim !== null) {
      if ((connection.refreshClaimUntil ?? 0) <= now) {
        if (
          await failCodexRefresh(
            env.DB,
            userId,
            connection.ciphertext,
            connection.refreshClaim,
            CODEX_RECONNECT_CAUSE,
          )
        )
          throw reconnectRequired()
        continue
      }
      await wait(POLL_MS)
      continue
    }
    let tokens: CodexTokens | null = null
    try {
      tokens = parseCodexTokens(
        await decrypt(
          connection.ciphertext,
          agentLoginContext(userId, 'codex'),
          env.BOAT_KEY_ENCRYPTION_KEY,
        ),
      )
    } catch {
      /* A corrupt login requires a new sign-in. */
    }
    if (!tokens) {
      if (
        await failCodexRefresh(
          env.DB,
          userId,
          connection.ciphertext,
          null,
          CODEX_RECONNECT_CAUSE,
        )
      )
        throw reconnectRequired()
      continue
    }
    if (
      tokens.accessToken !== failedAccessToken &&
      tokens.expiresAt > now + RENEW_BEFORE_MS
    )
      return tokens
    const claim = randomToken()
    if (
      !(await claimCodexRefresh(
        env.DB,
        userId,
        connection.ciphertext,
        claim,
        now + CLAIM_MS,
      ))
    )
      continue
    try {
      const fresh = await refreshCodexTokens(tokens, dependencies)
      if (!sameIdentity(tokens, fresh)) throw reconnectRequired()
      const ciphertext = await encrypt(
        JSON.stringify(fresh),
        agentLoginContext(userId, 'codex'),
        env.BOAT_KEY_ENCRYPTION_KEY,
      )
      if (
        await finishCodexRefresh(
          env.DB,
          userId,
          connection.ciphertext,
          claim,
          ciphertext,
        )
      )
        return fresh
    } catch {
      if (
        await failCodexRefresh(
          env.DB,
          userId,
          connection.ciphertext,
          claim,
          CODEX_RECONNECT_CAUSE,
        )
      )
        throw reconnectRequired()
    }
  }
  throw reconnectRequired()
}

export async function freshCodexLogin(
  env: AppEnv,
  userId: string,
  dependencies: CodexAuthDependencies,
  tasks: CodexTaskOwner,
  failedAccessToken?: string,
): Promise<CodexTokens> {
  let running = renewals.get(env.DB)
  if (!running) {
    running = new Map()
    renewals.set(env.DB, running)
  }
  const existing = running.get(userId)
  if (existing) {
    const result = await tasks.run(() => existing)
    if (
      failedAccessToken !== undefined &&
      result.accessToken === failedAccessToken
    )
      return freshCodexLogin(
        env,
        userId,
        dependencies,
        tasks,
        failedAccessToken,
      )
    return result
  }
  const shared = running
  const pending = tasks.run(async () => {
    try {
      return await renew(env, userId, dependencies, failedAccessToken)
    } finally {
      shared.delete(userId)
    }
  })
  shared.set(userId, pending)
  return pending
}
