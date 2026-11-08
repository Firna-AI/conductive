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
): Promise<boolean> {
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
  ])
  return result[1].meta.changes > 0
}
