import type { User } from '../../src/shared/api'

export type GitHubIdentity = Omit<User, 'id'> & {
  primaryVerifiedEmail: string | null
  githubCreatedAt: number | null
}

const columns = `id, github_id AS githubId, github_login AS githubLogin,
  display_name AS displayName, avatar_url AS avatarUrl`

export function readUser(db: D1Database, id: string): Promise<User | null> {
  return db
    .prepare(`SELECT ${columns} FROM users WHERE id = ?`)
    .bind(id)
    .first<User>()
}

export async function saveUser(
  db: D1Database,
  id: string,
  profile: GitHubIdentity,
  now: number,
  termsVersion?: string,
): Promise<User> {
  const user = await db
    .prepare(
      `INSERT INTO users (id, github_id, github_login, display_name, avatar_url, created_at, updated_at,
         terms_version, terms_accepted_at, primary_verified_email, github_created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (github_id) DO UPDATE SET
         github_login = excluded.github_login, display_name = excluded.display_name,
         avatar_url = excluded.avatar_url, updated_at = excluded.updated_at,
         primary_verified_email = excluded.primary_verified_email,
         github_created_at = excluded.github_created_at,
         terms_version = COALESCE(excluded.terms_version, users.terms_version),
         terms_accepted_at = CASE
           WHEN excluded.terms_version IS NOT NULL AND users.terms_version IS NOT excluded.terms_version
             THEN excluded.terms_accepted_at
           ELSE users.terms_accepted_at
         END
       RETURNING ${columns}`,
    )
    .bind(
      id,
      profile.githubId,
      profile.githubLogin,
      profile.displayName,
      profile.avatarUrl,
      now,
      now,
      termsVersion ?? null,
      termsVersion ? now : null,
      profile.primaryVerifiedEmail,
      profile.githubCreatedAt,
    )
    .first<User>()
  if (!user) throw new Error('The user record was not saved')
  return user
}

export async function saveSession(
  db: D1Database,
  sessionId: string,
  userId: string,
  expiresAt: number,
  now: number,
): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    db
      .prepare(
        'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
      )
      .bind(sessionId, userId, expiresAt),
  ])
}

export function sessionUser(
  db: D1Database,
  sessionId: string,
  now: number,
): Promise<User | null> {
  return db
    .prepare(
      `SELECT users.id, users.github_id AS githubId, users.github_login AS githubLogin,
      users.display_name AS displayName, users.avatar_url AS avatarUrl
     FROM users JOIN sessions ON sessions.user_id = users.id
     WHERE sessions.id = ? AND sessions.expires_at > ? AND users.suspended_at IS NULL`,
    )
    .bind(sessionId, now)
    .first<User>()
}

export async function deleteSession(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE id = ?').bind(id).run()
}

export async function saveOAuthState(
  db: D1Database,
  stateHash: string,
  expiresAt: number,
  now: number,
): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM oauth_states WHERE expires_at <= ?').bind(now),
    db
      .prepare(
        'INSERT INTO oauth_states (state_hash, expires_at) VALUES (?, ?)',
      )
      .bind(stateHash, expiresAt),
  ])
}

export async function takeOAuthState(
  db: D1Database,
  stateHash: string,
  now: number,
): Promise<boolean> {
  const row = await db
    .prepare(
      'DELETE FROM oauth_states WHERE state_hash = ? AND expires_at > ? RETURNING state_hash',
    )
    .bind(stateHash, now)
    .first()
  return row !== null
}
