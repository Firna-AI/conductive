/** A repository that a GitHub event names, with the install that sent it. */
export interface ReachedRepository {
  repositoryId: number
  installationId: number
}

/**
 * The saved rows `r` of `repositories` that an event of one install may
 * update. A repository belongs to one owner, and each owner has at most one
 * install of the GitHub App, so the install of an event is the current
 * install of its repository. A row of that install counts. After a move to
 * another owner, a row of the old install counts only in an org that
 * already uses the new install for another repository. So a move never
 * links an org to an install that no admin of the org chose.
 *
 * Bind the values of `reachedValues` in this order.
 */
export const REACHED_REPOSITORY_ROWS = `r.github_repository_id = ? AND (r.installation_id = ?
  OR EXISTS (SELECT 1 FROM repositories other WHERE other.org_id = r.org_id
    AND other.installation_id = ? AND other.github_repository_id != r.github_repository_id))`

export function reachedValues(repository: ReachedRepository): number[] {
  return [
    repository.repositoryId,
    repository.installationId,
    repository.installationId,
  ]
}

/** True when an active org saves the repository and the install is active. */
export async function reachesSavedRepository(
  db: D1Database,
  repository: ReachedRepository,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT r.id FROM repositories r
       JOIN github_installations i ON i.id = ? AND i.suspended_at IS NULL
       JOIN orgs o ON o.id = r.org_id AND o.deleted_at IS NULL
       WHERE ${REACHED_REPOSITORY_ROWS} LIMIT 1`,
    )
    .bind(repository.installationId, ...reachedValues(repository))
    .first<{ id: string }>()
  return row !== null
}
