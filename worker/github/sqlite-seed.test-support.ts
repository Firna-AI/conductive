import { SESSION_COOKIE } from '../security/cookies'
import { encrypt, sign } from '../security/crypto'
import { agentLoginContext } from '../chat/queries'
import { TEST_ORIGIN, type TestHarness } from '../test-support/harness'
import { seedAppAccess } from '../test-support/app-access'
import { SQLITE_WORKSPACE_ID } from './sqlite-fixtures.test-support'

export async function seedGitHubSQLite(base: TestHarness) {
  const db = base.env.DB
  await db.batch([
    db.prepare(
      "INSERT INTO users (id, github_id, github_login, created_at, updated_at) VALUES ('owner', 10, 'owner', 1, 1)",
    ),
    db.prepare(
      "INSERT INTO sessions (id, user_id, expires_at) VALUES ('session', 'owner', 4000000000000)",
    ),
    db.prepare(
      "INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES ('org', 'Org', 'owner', 1)",
    ),
    db.prepare(
      "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES ('org', 'owner', 'admin', 1)",
    ),
    db.prepare(
      "INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch) VALUES ('repo', 'org', 10, 'owner/repo', 'main')",
    ),
    db
      .prepare(
        "INSERT INTO workspaces (id, org_id, repository_id, owner_user_id, name, branch, created_at, updated_at) VALUES (?, 'org', 'repo', 'owner', 'Workspace', 'owner/workspace', 1, 1)",
      )
      .bind(SQLITE_WORKSPACE_ID),
  ])
  await seedAppAccess(db, ['owner'], 1)
  await db
    .prepare(
      'INSERT INTO agent_logins (user_id, agent, kind, ciphertext, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(
      'owner',
      'claude',
      'api-key',
      await encrypt(
        'adapter-secret',
        agentLoginContext('owner', 'claude'),
        base.env.BOAT_KEY_ENCRYPTION_KEY,
      ),
      1,
      1,
    )
    .run()
  const sessionToken = await sign(
    { sessionId: 'session', expiresAt: 4000000000000 },
    'session',
    base.env.SESSION_SIGNING_KEY,
  )
  return {
    Cookie: `${SESSION_COOKIE}=${sessionToken}`,
    Origin: TEST_ORIGIN,
    'Content-Type': 'application/json',
  }
}
