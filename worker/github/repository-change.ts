import { HttpError, isRecord } from '../http'

/**
 * A `repository` webhook that changes the name or the default branch of a
 * repository, after validation. A field is absent when the event keeps it.
 */
export interface RepositoryChange {
  repositoryId: number
  installationId: number
  fullName?: string
  defaultBranch?: string
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

/** GitHub names a repository as `owner/name`, each part without a slash. */
function fullName(value: unknown): string {
  if (typeof value !== 'string' || !/^[^/\s]+\/[^/\s]+$/u.test(value))
    return invalid()
  return value
}

/** A Git branch name has no whitespace. */
function branch(value: unknown): string {
  if (typeof value !== 'string' || !/^\S+$/u.test(value)) return invalid()
  return value
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
  if (!isRecord(value.repository)) return invalid()
  const common = {
    repositoryId: positiveId(value.repository),
    installationId: positiveId(value.installation),
  }
  return edited
    ? { ...common, defaultBranch: branch(value.repository.default_branch) }
    : { ...common, fullName: fullName(value.repository.full_name) }
}

/**
 * Saves the change in each org that connected the repository through the
 * same installation.
 */
export async function saveRepositoryChange(
  db: D1Database,
  change: RepositoryChange,
): Promise<void> {
  await db
    .prepare(
      `UPDATE repositories SET full_name = COALESCE(?, full_name),
       default_branch = COALESCE(?, default_branch)
       WHERE github_repository_id = ? AND installation_id = ?`,
    )
    .bind(
      change.fullName ?? null,
      change.defaultBranch ?? null,
      change.repositoryId,
      change.installationId,
    )
    .run()
}
