import type { Repository } from '../../src/shared/org-settings'
import { REPOSITORY_ORDER } from '../data/repository-order'
import { activeAdminPredicate } from '../members/org-data'

export function shellRepositoryId(orgId: string, githubId: number): string {
  return `github-${orgId}-${githubId}`
}

export async function saveShellRepository(
  db: D1Database,
  input: {
    repository: Repository
    userId: string
    selected: boolean
    now: number
  },
): Promise<{ saved: boolean; added: boolean }> {
  const { repository, userId, selected, now } = input
  const selectedValue = selected ? 1 : 0
  const result = await db.batch([
    renumberRepositoriesStatement(db, repository.orgId, userId),
    db
      .prepare(
        `UPDATE settings SET revision = revision + 1, updated_at = ?
       WHERE org_id = ? AND ${activeAdminPredicate}
       AND NOT EXISTS (SELECT 1 FROM repositories WHERE org_id = ?
         AND github_repository_id = ? AND selected = ?)`,
      )
      .bind(
        now,
        repository.orgId,
        repository.orgId,
        userId,
        repository.orgId,
        repository.githubId,
        selectedValue,
      ),
    db
      .prepare(
        `INSERT INTO repositories
       (id, org_id, github_repository_id, full_name, description, default_branch, installation_id,
        selected, position)
       SELECT ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN (
         SELECT COALESCE(MAX(position) + 1, 0) FROM repositories WHERE org_id = ? AND selected = 1
       ) END WHERE ${activeAdminPredicate}
       ON CONFLICT(org_id, github_repository_id) DO UPDATE SET
         full_name = excluded.full_name, description = excluded.description,
         default_branch = excluded.default_branch, installation_id = excluded.installation_id,
         position = CASE WHEN excluded.selected = 0 THEN NULL
           WHEN repositories.selected = 1 THEN repositories.position
           ELSE excluded.position END,
         selected = excluded.selected WHERE ${activeAdminPredicate}`,
      )
      .bind(
        repository.id,
        repository.orgId,
        repository.githubId,
        repository.fullName,
        repository.description,
        repository.defaultBranch,
        repository.installationId,
        selectedValue,
        selectedValue,
        repository.orgId,
        repository.orgId,
        userId,
        repository.orgId,
        userId,
      ),
    db
      .prepare(
        `UPDATE automations SET active = 0, inactive_reason = 'repository_removed',
         next_run_at = NULL, updated_at = ?
       WHERE org_id = ? AND repository_id = ? AND ? = 0
         AND EXISTS (SELECT 1 FROM repositories WHERE id = ? AND org_id = ? AND selected = 0)
         AND ${activeAdminPredicate}`,
      )
      .bind(
        now,
        repository.orgId,
        repository.id,
        selectedValue,
        repository.id,
        repository.orgId,
        repository.orgId,
        userId,
      ),
  ])
  return {
    saved: result[2].meta.changes > 0,
    added: selected && result[1].meta.changes > 0,
  }
}

/**
 * Gives each chosen repository of the org its index in the repository
 * order as its position, so that a chosen row without a position gets
 * one. It clears the position of each repository that is not chosen.
 */
function renumberRepositoriesStatement(
  db: D1Database,
  orgId: string,
  userId: string,
): D1PreparedStatement {
  return db
    .prepare(
      `WITH ranks AS MATERIALIZED (
         SELECT id, ROW_NUMBER() OVER (ORDER BY ${REPOSITORY_ORDER}) - 1 AS position
         FROM repositories WHERE org_id = ? AND selected = 1
       ) UPDATE repositories SET position = (
         SELECT ranks.position FROM ranks WHERE ranks.id = repositories.id
       ) WHERE org_id = ? AND (selected = 1 OR position IS NOT NULL)
         AND ${activeAdminPredicate}`,
    )
    .bind(orgId, orgId, orgId, userId)
}

/**
 * Moves a chosen repository to `index` of the repository order, which
 * counts the chosen repositories without the moved one. An index past the
 * end moves it to the end. Each chosen repository then has its index as
 * its position. A repository that is not chosen moves nothing. The
 * result says whether the move saved.
 */
export async function moveShellRepository(
  db: D1Database,
  input: { orgId: string; userId: string; repositoryId: string; index: number },
): Promise<boolean> {
  const { orgId, userId, repositoryId, index } = input
  const result = await db
    .prepare(
      `WITH siblings AS MATERIALIZED (
         SELECT id, ROW_NUMBER() OVER (ORDER BY ${REPOSITORY_ORDER}) - 1 AS rank
         FROM repositories WHERE org_id = ? AND selected = 1 AND id != ?
       ), destination AS MATERIALIZED (
         SELECT MIN(?, COUNT(*)) AS position FROM siblings
       ), ranks AS MATERIALIZED (
         SELECT siblings.id,
           rank + CASE WHEN rank >= destination.position THEN 1 ELSE 0 END AS position
         FROM siblings CROSS JOIN destination
         UNION ALL SELECT ?, position FROM destination
       ) UPDATE repositories SET position = (
         SELECT ranks.position FROM ranks WHERE ranks.id = repositories.id
       ) WHERE org_id = ? AND id IN (SELECT id FROM ranks)
         AND EXISTS (SELECT 1 FROM repositories target
           WHERE target.id = ? AND target.org_id = ? AND target.selected = 1)
         AND ${activeAdminPredicate}`,
    )
    .bind(
      orgId,
      repositoryId,
      index,
      repositoryId,
      orgId,
      repositoryId,
      orgId,
      orgId,
      userId,
    )
    .run()
  return result.meta.changes > 0
}
