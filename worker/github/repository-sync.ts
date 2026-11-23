import type { GitHubRepositoryValues } from './repository-read'
import type { RepositoryChangeDependencies } from './repository-change'
import { completeDelivery, recordDelivery, repositoryWorkspaces } from './data'
import {
  REACHED_REPOSITORY_ROWS,
  reachedValues,
  type ReachedRepository,
} from './repository-reach'

const SYNC_ATTEMPTS = 3

interface SavedRow extends GitHubRepositoryValues {
  id: string
  orgId: string
  installationId: number
}

function savedRows(
  db: D1Database,
  repository: ReachedRepository,
): Promise<SavedRow[]> {
  return db
    .prepare(
      `SELECT r.id, r.org_id AS orgId, r.full_name AS fullName, r.default_branch AS defaultBranch,
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
  deliveryId: string | null,
): Promise<boolean> {
  if (rows.length === 0) return true
  const results = await db.batch(
    rows.map((row) =>
      db
        .prepare(
          `UPDATE repositories SET full_name = ?, default_branch = ?, installation_id = ?
           WHERE id = ? AND full_name = ? AND default_branch = ? AND installation_id = ?
           AND (? IS NULL OR EXISTS (SELECT 1 FROM github_webhook_deliveries d
             WHERE d.delivery_id = ? AND d.processed_at IS NULL))`,
        )
        .bind(
          values.fullName,
          values.defaultBranch,
          installationId,
          row.id,
          row.fullName,
          row.defaultBranch,
          row.installationId,
          deliveryId,
          deliveryId,
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
  prepare?: RepositoryChangeDependencies['prepareDefaultBranchChange'],
  now: () => number = Date.now,
): Promise<void> {
  for (let attempt = 0; attempt < SYNC_ATTEMPTS; attempt += 1) {
    const deliveryId = prepare
      ? `repository-default:${crypto.randomUUID()}`
      : null
    if (deliveryId) await recordDelivery(db, deliveryId, now())
    try {
      const rows = await savedRows(db, repository)
      const values = await read()
      if (prepare && deliveryId)
        for (const row of rows) {
          if (row.defaultBranch === values.defaultBranch) continue
          const workspaces = await repositoryWorkspaces(
            db,
            repository.repositoryId,
            row.installationId,
          )
          for (const workspace of workspaces)
            if (
              workspace.orgId === row.orgId &&
              workspace.defaultBranch === row.defaultBranch &&
              workspace.fullName === row.fullName &&
              workspace.baseBranch == null
            )
              await prepare(
                workspace,
                values,
                repository.installationId,
                deliveryId,
              )
        }
      if (
        !(await compareAndSave(
          db,
          rows,
          values,
          repository.installationId,
          deliveryId,
        ))
      )
        continue
      const confirmed = await read()
      if (
        confirmed.fullName === values.fullName &&
        confirmed.defaultBranch === values.defaultBranch
      )
        return
    } finally {
      if (deliveryId) await completeDelivery(db, deliveryId, now())
    }
  }
  throw new Error('Repository values did not settle')
}
