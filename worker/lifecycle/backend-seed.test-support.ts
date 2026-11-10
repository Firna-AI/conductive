import type { Org, User } from '../../src/shared/api'
import { TERMS_VERSION } from '../../src/shared/terms'
import { agentLoginContext } from '../chat/queries'
import { SESSION_COOKIE } from '../security/cookies'
import { encrypt, sign } from '../security/crypto'
import { saveGitHubTokens } from '../security/github-tokens'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { seedAppAccess } from '../test-support/app-access'

export async function seedBackendLogin(harness: TestHarness, userId: string) {
  const db = harness.env.DB
  const statements = await Promise.all(
    (['claude', 'codex'] as const).map(async (agent) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO agent_logins (user_id, agent, kind, ciphertext, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .bind(
          userId,
          agent,
          'api-key',
          await encrypt(
            `secret-${userId}-${agent}`,
            agentLoginContext(userId, agent),
            harness.env.BOAT_KEY_ENCRYPTION_KEY,
          ),
          TEST_TIME,
          TEST_TIME,
        ),
    ),
  )
  await db.batch(statements)
}

export async function seedBackend(harness: TestHarness) {
  const tokens = harness.reserveTokens(5)
  const user: User = {
    id: tokens[2],
    githubId: 7,
    githubLogin: 'octocat',
    displayName: 'Octocat',
    avatarUrl: null,
  }
  const org: Org = { id: tokens[4], name: 'Example org', role: 'admin' }
  const sessionId = tokens[3]
  const expiresAt = TEST_TIME + 604_800_000
  const db = harness.env.DB
  await db.batch([
    db
      .prepare(
        'INSERT INTO users (id, github_id, github_login, display_name, avatar_url, created_at, updated_at, terms_version, terms_accepted_at) VALUES (?, 7, ?, ?, NULL, ?, ?, ?, ?)',
      )
      .bind(
        user.id,
        user.githubLogin,
        user.displayName,
        TEST_TIME,
        TEST_TIME,
        TERMS_VERSION,
        TEST_TIME,
      ),
    db
      .prepare(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      )
      .bind(sessionId, user.id, expiresAt),
    db
      .prepare(
        'INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(org.id, org.name, user.id, TEST_TIME),
    db
      .prepare(
        "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)",
      )
      .bind(org.id, user.id, TEST_TIME),
    db
      .prepare('INSERT INTO settings (org_id, updated_at) VALUES (?, ?)')
      .bind(org.id, TEST_TIME),
    db
      .prepare(
        "INSERT INTO sections (id, org_id, name, position, is_default, created_at) VALUES (?, ?, 'General', 0, 1, ?)",
      )
      .bind(`general-${org.id}`, org.id, TEST_TIME),
  ])
  await Promise.all([
    seedAppAccess(db, [user.id], TEST_TIME),
    seedBackendLogin(harness, user.id),
    saveGitHubTokens(
      harness.env,
      user.id,
      {
        accessToken: 'github-test-token',
        expiresAt: null,
        refreshToken: null,
        refreshExpiresAt: null,
      },
      TEST_TIME,
    ),
  ])
  const session = `${SESSION_COOKIE}=${await sign(
    { sessionId, expiresAt },
    'session',
    harness.env.SESSION_SIGNING_KEY,
  )}`
  return { user, org, session }
}
