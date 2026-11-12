import type { GitHubRepository } from '../../src/shared/account'
import { shellRepositoryId } from './feature-repositories-data'

export async function insertShellOrg(
  db: D1Database,
  input: {
    id: string
    name: string
    initials?: string
    userId: string
    providerAccount: string
    repositories: readonly GitHubRepository[]
    now: number
  },
): Promise<boolean> {
  const { id, name, initials, userId, providerAccount, repositories, now } =
    input
  const createdOrg =
    'EXISTS (SELECT 1 FROM orgs WHERE id = ? AND creator_user_id = ?)'
  const result = await db.batch([
    db
      .prepare(
        `INSERT INTO orgs (id, name, initials, creator_user_id, created_at, provider_account)
       SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (
         SELECT 1 FROM users WHERE id = ? AND suspended_at IS NULL)`,
      )
      .bind(id, name, initials ?? null, userId, now, providerAccount, userId),
    db
      .prepare(
        `INSERT INTO org_members (org_id, user_id, role, joined_at)
       SELECT ?, ?, 'admin', ? WHERE ${createdOrg}`,
      )
      .bind(id, userId, now, id, userId),
    db
      .prepare(
        `INSERT INTO settings (org_id, updated_at) SELECT ?, ? WHERE ${createdOrg}`,
      )
      .bind(id, now, id, userId),
    db
      .prepare(
        `INSERT INTO sections (id, org_id, name, position, is_default, created_at)
       SELECT ?, ?, 'General', 0, 1, ? WHERE ${createdOrg}`,
      )
      .bind(`general-${id}`, id, now, id, userId),
    ...repositories.map((repository) =>
      db
        .prepare(
          `INSERT INTO repositories
       (id, org_id, github_repository_id, full_name, description, default_branch, installation_id, selected)
       SELECT ?, ?, ?, ?, ?, ?, ?, 1 WHERE ${createdOrg}`,
        )
        .bind(
          shellRepositoryId(id, repository.githubId),
          id,
          repository.githubId,
          repository.fullName,
          repository.description,
          repository.defaultBranch,
          repository.installationId,
          id,
          userId,
        ),
    ),
  ])
  return result[0].meta.changes > 0
}
