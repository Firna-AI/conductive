import type { AppEnv } from '../../env'
import { LifecycleBoat } from '../../lifecycle/lifecycle-boat-test-support'
import { seedPublishedImage } from '../../lifecycle/published-image-test-support'
import { storeWorkspaceToken } from '../../lifecycle/tokens'
import { storeBoatKey } from '../../sandbox/keys'
import { SESSION_COOKIE } from '../../security/cookies'
import { encrypt, sign } from '../../security/crypto'
import { agentLoginContext } from '../queries'

export const OUTER_ORG = 'chat-org'
export const OUTER_WORKSPACE = 'workspace one'
export const OTHER_WORKSPACE = 'workspace two'
export const OUTER_TOKEN = 'outer-workspace-token'
export const OTHER_TOKEN = 'other-workspace-token'
export const OUTER_REPOSITORY = 'chat-repository'
export const OUTER_SECTION = 'chat-section'
export const OUTER_SOFTWARE = {
  url: 'https://software.conductive.test/runner.tar.gz',
  sha256: 'a'.repeat(64),
}

export async function seedOuterRuntime(env: AppEnv, boat: LifecycleBoat) {
  const now = Date.now()
  const db = env.DB
  await db.batch([
    db.prepare(
      `INSERT INTO users (id, github_id, github_login, created_at, updated_at)
       VALUES ('owner', 101, 'owner', 1, 1), ('member', 102, 'member', 1, 1),
       ('outsider', 103, 'outsider', 1, 1)`,
    ),
    db.prepare(
      `INSERT INTO orgs (id, name, creator_user_id, created_at)
       VALUES ('chat-org', 'Chat org', 'owner', 1), ('other-org', 'Other org', 'outsider', 1)`,
    ),
    db.prepare(
      `INSERT INTO org_members (org_id, user_id, role, joined_at)
       VALUES ('chat-org', 'owner', 'admin', 1), ('chat-org', 'member', 'member', 1),
       ('other-org', 'outsider', 'admin', 1)`,
    ),
    db.prepare(
      `INSERT INTO sections (id, org_id, name, is_default, position, created_at)
       VALUES ('chat-section', 'chat-org', 'General', 1, 0, 1)`,
    ),
    db.prepare(
      `INSERT INTO repositories (id, org_id, github_repository_id, full_name, default_branch, installation_id)
       VALUES ('chat-repository', 'chat-org', 101, 'owner/repository', 'main', 91)`,
    ),
    db.prepare(
      `INSERT INTO settings (org_id, org_image_name, updated_at)
       VALUES ('chat-org', 'outer-image', 1)`,
    ),
    ...[OUTER_WORKSPACE, OTHER_WORKSPACE].map((id) =>
      db
        .prepare(
          `INSERT INTO workspaces
           (id, org_id, repository_id, owner_user_id, section_id, name, branch, state, created_at, updated_at)
           VALUES (?, 'chat-org', 'chat-repository', 'owner', 'chat-section', ?, ?, 'ready', 1, 1)`,
        )
        .bind(id, id, `owner/${id.replaceAll(' ', '-')}`),
    ),
  ])
  await storeWorkspaceToken(env, OUTER_WORKSPACE, OUTER_TOKEN, now)
  await storeWorkspaceToken(env, OTHER_WORKSPACE, OTHER_TOKEN, now)
  for (const userId of ['owner', 'member']) {
    await db
      .prepare(
        `INSERT INTO agent_logins (user_id, agent, kind, ciphertext, created_at, updated_at)
         VALUES (?, 'claude', 'api-key', ?, ?, ?)`,
      )
      .bind(
        userId,
        await encrypt(
          `outer-secret-${userId}`,
          agentLoginContext(userId, 'claude'),
          env.BOAT_KEY_ENCRYPTION_KEY,
        ),
        now,
        now,
      )
      .run()
  }
  await seedPublishedImage(db, {
    orgId: OUTER_ORG,
    buildId: 'outer-image-build',
    imageName: 'outer-image',
    repositories: [
      {
        id: OUTER_REPOSITORY,
        orgId: OUTER_ORG,
        fullName: 'owner/repository',
        defaultBranch: 'main',
      },
    ],
    software: OUTER_SOFTWARE,
    now,
  })
  await storeBoatKey(env, OUTER_ORG, 'owner', 'boat-first', boat.fetch, now)
  const cookieFor = async (userId: string) => {
    const sessionId = `outer-${userId}-session`
    const expiresAt = 4_000_000_000_000
    await db
      .prepare(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      )
      .bind(sessionId, userId, expiresAt)
      .run()
    return `${SESSION_COOKIE}=${await sign({ sessionId, expiresAt }, 'session', env.SESSION_SIGNING_KEY)}`
  }
  return {
    ownerCookie: await cookieFor('owner'),
    memberCookie: await cookieFor('member'),
    outsiderCookie: await cookieFor('outsider'),
  }
}
