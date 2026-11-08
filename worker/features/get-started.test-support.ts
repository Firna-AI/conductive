import type { OuterRuntime } from '../chat/integration/outer-runtime.test-support'
import { saveSession } from '../data/users'
import { SESSION_COOKIE } from '../security/cookies'
import { sign } from '../security/crypto'
import { saveGitHubTokens } from '../security/github-tokens'

export async function getStartedUser(active: OuterRuntime): Promise<string> {
  await active.env.DB.prepare(
    "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('new-user', 104, 'new-user', 1, 1)",
  ).run()
  const sessionId = 'new-user-session'
  const expiresAt = 4_000_000_000_000
  await saveSession(active.env.DB, sessionId, 'new-user', expiresAt, Date.now())
  return `${SESSION_COOKIE}=${await sign({ sessionId, expiresAt }, 'session', active.env.SESSION_SIGNING_KEY)}`
}

export async function connectGetStartedGitHub(
  active: OuterRuntime,
): Promise<void> {
  await saveGitHubTokens(
    active.env,
    'new-user',
    {
      accessToken: 'new-user-token',
      refreshToken: null,
      expiresAt: null,
      refreshExpiresAt: null,
    },
    Date.now(),
  )
}
