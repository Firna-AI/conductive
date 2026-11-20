import type { GitHubRepositoryValues } from './repository-read'
import {
  REACHED_REPOSITORY_ROWS,
  reachedValues,
  type ReachedRepository,
} from './repository-reach'

const SYNC_ATTEMPTS = 3

interface SavedRow extends GitHubRepositoryValues {
  id: string
  installationId: number
}

function savedRows(
  db: D1Database,
  repository: ReachedRepository,
): Promise<SavedRow[]> {
  return db
    .prepare(
      `SELECT r.id, r.full_name AS fullName, r.default_branch AS defaultBranch,
       r.installation_id AS installationId
       FROM repositories r WHERE ${REACHED_REPOSITORY_ROWS}`,
    )
    .bind(...reachedValues(repository))
    .all<SavedRow>()
    .then((result) => result.results)
}

/** Each row changes only while it still holds the values read before. */
async function compareAndSave(
  db: D1Database,
  rows: readonly SavedRow[],
  values: GitHubRepositoryValues,
  installationId: number,
): Promise<boolean> {
  if (rows.length === 0) return true
  const results = await db.batch(
    rows.map((row) =>
      db
        .prepare(
          `UPDATE repositories SET full_name = ?, default_branch = ?, installation_id = ?
           WHERE id = ? AND full_name = ? AND default_branch = ? AND installation_id = ?`,
        )
        .bind(
          values.fullName,
          values.defaultBranch,
          installationId,
          row.id,
          row.fullName,
          row.defaultBranch,
          row.installationId,
        ),
    ),
  )
  return results.every((result) => result.meta.changes === 1)
}

/**
 * Saves the current GitHub values of one repository in each org that the
 * install of the event reaches, as `REACHED_REPOSITORY_ROWS` says. The read
 * uses a token of that install, so a successful read also shows that the
 * install reaches the repository. The save then records that install too,
 * which follows a move to another owner.
 *
 * Two webhooks can read GitHub at the same time and save in the wrong
 * order. So a save applies only when no other save came after the read,
 * and a read after the save confirms the values. The webhook that saves
 * last then always read GitHub after its own save. After the last attempt,
 * the error leaves the delivery retryable.
 */
export async function syncRepositoryValues(
  db: D1Database,
  repository: ReachedRepository,
  read: () => Promise<GitHubRepositoryValues>,
): Promise<void> {
  for (let attempt = 0; attempt < SYNC_ATTEMPTS; attempt += 1) {
    const rows = await savedRows(db, repository)
    const values = await read()
    if (!(await compareAndSave(db, rows, values, repository.installationId)))
      continue
    const confirmed = await read()
    if (
      confirmed.fullName === values.fullName &&
      confirmed.defaultBranch === values.defaultBranch
    )
      return
  }
  throw new Error('Repository values did not settle')
}
