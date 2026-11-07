import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { decrypt, encrypt, randomToken } from './crypto'
import {
  claimGitHubRefresh,
  finishGitHubRefresh,
  readGitHubConnection,
  saveGitHubConnection,
} from './github-connection-store'
import { refreshGitHubTokens } from './github-refresh'
import {
  parseStoredGitHubTokens,
  type GitHubTokenBundle,
} from './github-token-data'

const RENEW_BEFORE_MS = 60_000
const REFRESH_CLAIM_MS = 35_000
const POLL_MS = 100

export interface GitHubTokenDependencies extends Pick<
  AppDependencies,
  'fetch' | 'now'
> {
  wait?: (milliseconds: number) => Promise<void>
}

function reconnectRequired(): HttpError {
  return new HttpError(
    401,
    'github_reconnect_required',
    'GitHub access expired. Sign in with GitHub again.',
  )
}

function context(userId: string): string {
  return `github-connection:${userId}`
}

async function encryptTokens(
  env: AppEnv,
  userId: string,
  tokens: GitHubTokenBundle,
): Promise<string> {
  return encrypt(
    JSON.stringify(tokens),
    context(userId),
    env.BOAT_KEY_ENCRYPTION_KEY,
  )
}

export async function saveGitHubTokens(
  env: AppEnv,
  userId: string,
  tokens: GitHubTokenBundle,
  now: number,
): Promise<void> {
  await saveGitHubConnection(
    env.DB,
    userId,
    await encryptTokens(env, userId, tokens),
    now,
  )
}

async function readTokens(
  env: AppEnv,
  userId: string,
  ciphertext: string,
): Promise<GitHubTokenBundle> {
  try {
    const value: unknown = JSON.parse(
      await decrypt(ciphertext, context(userId), env.BOAT_KEY_ENCRYPTION_KEY),
    )
    const tokens = parseStoredGitHubTokens(value)
    if (tokens) return tokens
  } catch {
    // Corrupt or mismatched credentials require a new GitHub sign-in.
  }
  throw reconnectRequired()
}

/** Call for each helper request with a sender ID from trusted turn state. */
export async function freshGitHubUserToken(
  env: AppEnv,
  userId: string,
  dependencies: GitHubTokenDependencies,
): Promise<string> {
  const wait =
    dependencies.wait ??
    ((milliseconds) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)))
  for (let poll = 0; poll <= REFRESH_CLAIM_MS / POLL_MS; poll++) {
    const connection = await readGitHubConnection(env.DB, userId)
    if (!connection) throw reconnectRequired()
    const now = dependencies.now()
    if (connection.refreshClaim !== null) {
      // Never take over an old claim: its one-time token may be consumed.
      if ((connection.refreshClaimUntil ?? 0) <= now) {
        throw reconnectRequired()
      }
      await wait(POLL_MS)
      continue
    }
    const tokens = await readTokens(env, userId, connection.ciphertext)
    if (tokens.expiresAt === null || tokens.expiresAt > now + RENEW_BEFORE_MS) {
      return tokens.accessToken
    }
    if (tokens.refreshExpiresAt <= now) throw reconnectRequired()
    const claim = randomToken()
    if (
      !(await claimGitHubRefresh(
        env.DB,
        userId,
        connection.ciphertext,
        claim,
        now + REFRESH_CLAIM_MS,
      ))
    ) {
      continue
    }
    try {
      const fresh = await refreshGitHubTokens(
        env,
        tokens.refreshToken,
        dependencies,
      )
      if (
        await finishGitHubRefresh(
          env.DB,
          userId,
          connection.ciphertext,
          claim,
          await encryptTokens(env, userId, fresh),
          dependencies.now(),
        )
      ) {
        return fresh.accessToken
      }
    } catch (error) {
      const latest = await readGitHubConnection(env.DB, userId)
      if (
        latest?.ciphertext === connection.ciphertext &&
        latest.refreshClaim === claim
      ) {
        throw error
      }
    }
  }
  throw reconnectRequired()
}
