import type { Repository } from '../../src/shared/org-settings'
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
       (id, org_id, github_repository_id, full_name, description, default_branch, installation_id, selected)
       SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE ${activeAdminPredicate}
       ON CONFLICT(org_id, github_repository_id) DO UPDATE SET
         full_name = excluded.full_name, description = excluded.description,
         default_branch = excluded.default_branch, installation_id = excluded.installation_id,
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
        repository.orgId,
        userId,
        repository.orgId,
        userId,
      ),
    db
      .prepare(
        `UPDATE routines SET active = 0, inactive_reason = 'repository_removed',
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
    saved: result[1].meta.changes > 0,
    added: selected && result[0].meta.changes > 0,
  }
}
