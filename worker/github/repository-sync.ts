import type { GitHubRepositoryValues } from './repository-read'

const SYNC_ATTEMPTS = 3

interface SavedRow extends GitHubRepositoryValues {
  id: string
}

function savedRows(
  db: D1Database,
  repository: { repositoryId: number; installationId: number },
): Promise<SavedRow[]> {
  return db
    .prepare(
      `SELECT id, full_name AS fullName, default_branch AS defaultBranch
       FROM repositories WHERE github_repository_id = ? AND installation_id = ?`,
    )
    .bind(repository.repositoryId, repository.installationId)
    .all<SavedRow>()
    .then((result) => result.results)
}

/** Each row changes only while it still holds the values read before. */
async function compareAndSave(
  db: D1Database,
  rows: readonly SavedRow[],
  values: GitHubRepositoryValues,
): Promise<boolean> {
  if (rows.length === 0) return true
  const results = await db.batch(
    rows.map((row) =>
      db
        .prepare(
          `UPDATE repositories SET full_name = ?, default_branch = ?
           WHERE id = ? AND full_name = ? AND default_branch = ?`,
        )
        .bind(
          values.fullName,
          values.defaultBranch,
          row.id,
          row.fullName,
          row.defaultBranch,
        ),
    ),
  )
  return results.every((result) => result.meta.changes === 1)
}

/**
 * Saves the current GitHub values of one repository in each org of its
 * installation. Two webhooks can read GitHub at the same time and save in
 * the wrong order. So a save applies only when no other save came after
 * the read, and a read after the save confirms the values. The webhook
 * that saves last then always read GitHub after its own save. After the
 * last attempt, the error leaves the delivery retryable.
 */
export async function syncRepositoryValues(
  db: D1Database,
  repository: { repositoryId: number; installationId: number },
  read: () => Promise<GitHubRepositoryValues>,
): Promise<void> {
  for (let attempt = 0; attempt < SYNC_ATTEMPTS; attempt += 1) {
    const rows = await savedRows(db, repository)
    const values = await read()
    if (!(await compareAndSave(db, rows, values))) continue
    const confirmed = await read()
    if (
      confirmed.fullName === values.fullName &&
      confirmed.defaultBranch === values.defaultBranch
    )
      return
  }
  throw new Error('Repository values did not settle')
}
