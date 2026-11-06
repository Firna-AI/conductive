import type { Org, User } from '../../src/shared/api'
import { SESSION_COOKIE } from '../security/cookies'
import { sign } from '../security/crypto'
import { TEST_TIME, type TestHarness } from '../test-support/harness'

export async function membersSeed(harness: TestHarness) {
  const [admin, member, other] = await Promise.all([
    signedIdentity(harness, 10, 'admin'),
    signedIdentity(harness, 11, 'member'),
    signedIdentity(harness, 12, 'other'),
  ])
  const org: Org = { id: 'members-org', name: 'Members org', role: 'admin' }
  const db = harness.env.DB
  return {
    fixture: {
      admin: admin.identity,
      member: member.identity,
      other: other.identity,
      org,
    },
    profile: { id: 12, login: 'other', name: 'other', avatar_url: null },
    statements: [
      ...[admin, member, other].flatMap((actor) => actor.statements),
      db
        .prepare(
          'INSERT INTO orgs (id, name, creator_user_id, created_at) VALUES (?, ?, ?, ?)',
        )
        .bind(org.id, org.name, admin.identity.user.id, TEST_TIME),
      db
        .prepare(
          "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'admin', ?)",
        )
        .bind(org.id, admin.identity.user.id, TEST_TIME),
      ...[member, other].map((actor) =>
        db
          .prepare(
            "INSERT INTO org_members (org_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)",
          )
          .bind(org.id, actor.identity.user.id, TEST_TIME + 10),
      ),
      db
        .prepare('INSERT INTO settings (org_id, updated_at) VALUES (?, ?)')
        .bind(org.id, TEST_TIME),
    ],
  }
}

async function signedIdentity(
  harness: TestHarness,
  githubId: number,
  githubLogin: string,
) {
  const user: User = {
    id: `members-${githubLogin}`,
    githubId,
    githubLogin,
    displayName: githubLogin,
    avatarUrl: null,
  }
  const sessionId = `members-session-${githubLogin}`
  const expiresAt = TEST_TIME + 604800000
  const token = await sign(
    { sessionId, expiresAt },
    'session',
    harness.env.SESSION_SIGNING_KEY,
  )
  const db = harness.env.DB
  return {
    identity: { user, session: `${SESSION_COOKIE}=${token}` },
    statements: [
      db
        .prepare(
          `INSERT INTO users (id, github_id, github_login, display_name, avatar_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          user.id,
          githubId,
          githubLogin,
          user.displayName,
          user.avatarUrl,
          TEST_TIME,
          TEST_TIME,
        ),
      db
        .prepare(
          'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
        )
        .bind(sessionId, user.id, expiresAt),
    ],
  }
}
