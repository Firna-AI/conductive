import type { Org } from '../../src/shared/api'
import { TERMS_VERSION } from '../../src/shared/terms'
import { SESSION_COOKIE } from '../security/cookies'
import { saveGitHubTokens } from '../security/github-tokens'
import { encrypt, hash, sign } from '../security/crypto'
import { TEST_TIME, type TestHarness } from '../test-support/harness'
import { seedAppAccess } from '../test-support/app-access'
import { agentLoginContext } from './queries'

export async function seedChatFixture(
  harness: TestHarness,
  workspaceId: string,
  workspaceToken: string,
) {
  const tokens = harness.reserveTokens(9)
  const owner = { id: tokens[2] }
  const member = { id: tokens[7] }
  const org: Org = { id: tokens[4], name: 'Example org', role: 'admin' }
  const expiresAt = TEST_TIME + 604_800_000
  const db = harness.env.DB
  const people = [
    {
      ...owner,
      githubId: 7,
      login: 'octocat',
      name: 'Octocat',
      sessionId: tokens[3],
    },
    {
      ...member,
      githubId: 8,
      login: 'teammate',
      name: 'Teammate',
      sessionId: tokens[8],
    },
  ]
  const logins = await Promise.all(
    people.flatMap((user) =>
      (['claude', 'codex'] as const).map(async (agent) =>
        db
          .prepare(
            'INSERT INTO agent_logins (user_id, agent, kind, ciphertext, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .bind(
            user.id,
            agent,
            'api-key',
            await encrypt(
              `secret-${user.id}-${agent}`,
              agentLoginContext(user.id, agent),
              harness.env.BOAT_KEY_ENCRYPTION_KEY,
            ),
            TEST_TIME,
            TEST_TIME,
          ),
      ),
    ),
  )
  await db.batch([
    ...people.flatMap((user) => [
      db
        .prepare(
          'INSERT INTO users (id, github_id, github_login, display_name, avatar_url, created_at, updated_at, terms_version, terms_accepted_at) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?)',
        )
        .bind(
          user.id,
          user.githubId,
          user.login,
          user.name,
          TEST_TIME,
          TEST_TIME,
          TERMS_VERSION,
          TEST_TIME,
        ),
      db
        .prepare(
          'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
        )
        .bind(user.sessionId, user.id, expiresAt),
    ]),
    db
      .prepare(
        'INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(org.id, org.name, owner.id, TEST_TIME),
    ...people.map((user, index) =>
      db
        .prepare(
          'INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)',
        )
        .bind(org.id, user.id, index === 0 ? 'admin' : 'member', TEST_TIME),
    ),
    db
      .prepare('INSERT INTO settings (org_id, updated_at) VALUES (?, ?)')
      .bind(org.id, TEST_TIME),
    db
      .prepare(
        "INSERT INTO sections (id, org_id, name, position, is_default, created_at) VALUES (?, ?, 'General', 0, 1, ?)",
      )
      .bind(`general-${org.id}`, org.id, TEST_TIME),
    db
      .prepare(
        "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('repo', ?, 10, 'example/repo', 'main')",
      )
      .bind(org.id),
    db
      .prepare(
        "INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at) VALUES (?, ?, 'repo', ?, '', 'octocat/test', ?, ?)",
      )
      .bind(workspaceId, org.id, owner.id, TEST_TIME, TEST_TIME),
    db
      .prepare(
        'INSERT INTO workspace_tokens (workspace_id, token_hash, ciphertext, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(
        workspaceId,
        await hash(workspaceToken),
        'unused-token-ciphertext',
        TEST_TIME,
      ),
    ...logins,
  ])
  await seedAppAccess(
    db,
    people.map((user) => user.id),
    TEST_TIME,
  )
  await Promise.all(
    people.map((user) =>
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
    ),
  )
  const cookies = await Promise.all(
    people.map(
      async (user) =>
        `${SESSION_COOKIE}=${await sign({ sessionId: user.sessionId, expiresAt }, 'session', harness.env.SESSION_SIGNING_KEY)}`,
    ),
  )
  harness.github.profile = {
    id: 8,
    login: 'teammate',
    name: 'Teammate',
    avatar_url: null,
  }
  return {
    org,
    owner,
    member,
    ownerCookie: cookies[0],
    memberCookie: cookies[1],
  }
}
