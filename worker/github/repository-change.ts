import { HttpError, isRecord } from '../http'
import { warnWorker } from '../warnings'
import { installedRepository } from './composition-data'
import { completeDelivery, isProcessed, recordDelivery } from './data'
import type { GitHubRepositoryValues } from './repository-read'

/**
 * A `repository` webhook that changes the name or the default branch of a
 * repository. It names only the repository, because the handler reads the
 * current values from GitHub.
 */
export interface RepositoryChange {
  repositoryId: number
  installationId: number
}

export interface RepositoryChangeDependencies {
  /** Reads the current values of the repository from GitHub. */
  read: (change: RepositoryChange) => Promise<GitHubRepositoryValues>
  /** Wakes the image coordinator of each org whose image holds old values. */
  changed: (change: RepositoryChange) => Promise<void>
}

function invalid(): never {
  throw new HttpError(
    400,
    'github_webhook_invalid',
    'The GitHub webhook is not valid.',
  )
}

function positiveId(value: unknown): number {
  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    !Number.isSafeInteger(value.id) ||
    value.id <= 0
  )
    return invalid()
  return value.id
}

/**
 * Reads the `renamed` action and the `edited` action that changes the
 * default branch. Null for each other event and action, which the caller
 * ignores.
 */
export function repositoryChange(
  event: string,
  value: unknown,
): RepositoryChange | null {
  if (event !== 'repository') return null
  if (!isRecord(value)) return invalid()
  const edited =
    value.action === 'edited' &&
    isRecord(value.changes) &&
    value.changes.default_branch !== undefined
  if (value.action !== 'renamed' && !edited) return null
  return {
    repositoryId: positiveId(value.repository),
    installationId: positiveId(value.installation),
  }
}

/**
 * Saves the values in each org that connected the repository through the
 * same installation.
 */
async function saveRepositoryValues(
  db: D1Database,
  change: RepositoryChange,
  values: GitHubRepositoryValues,
): Promise<void> {
  await db
    .prepare(
      `UPDATE repositories SET full_name = ?, default_branch = ?
       WHERE github_repository_id = ? AND installation_id = ?`,
    )
    .bind(
      values.fullName,
      values.defaultBranch,
      change.repositoryId,
      change.installationId,
    )
    .run()
}

/**
 * A failed read leaves the delivery retryable, and a retry reads GitHub
 * again. A failed wake only warns, because the image coordinator compares
 * the saved values with its image at each later alarm.
 */
export async function handleRepositoryChange(
  db: D1Database,
  change: RepositoryChange,
  deliveryId: string,
  now: () => number,
  dependencies: RepositoryChangeDependencies | undefined,
): Promise<void> {
  if (await isProcessed(db, deliveryId)) return
  await recordDelivery(db, deliveryId, now())
  if (
    dependencies &&
    (await installedRepository(db, change.repositoryId, change.installationId))
  ) {
    await saveRepositoryValues(db, change, await dependencies.read(change))
    try {
      await dependencies.changed(change)
    } catch {
      warnWorker({ kind: 'repository_change_wake_failed' })
    }
  }
  await completeDelivery(db, deliveryId, now())
}
