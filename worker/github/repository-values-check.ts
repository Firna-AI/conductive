import { isRecord } from '../http'
import { warnWorker } from '../warnings'
import type {
  RepositoryChange,
  RepositoryChangeDependencies,
} from './repository-change'
import { syncRepositoryValues } from './repository-sync'

interface PayloadValues {
  fullName: string | null
  defaultBranch: string | null
}

/** A value that does not look like GitHub's counts as absent. */
function payloadValues(value: unknown): PayloadValues {
  const repository = isRecord(value) ? value.repository : undefined
  if (!isRecord(repository)) return { fullName: null, defaultBranch: null }
  const { full_name: fullName, default_branch: defaultBranch } = repository
  return {
    fullName:
      typeof fullName === 'string' && /^[^/\s]+\/[^/\s]+$/u.test(fullName)
        ? fullName
        : null,
    defaultBranch:
      typeof defaultBranch === 'string' && /^\S+$/u.test(defaultBranch)
        ? defaultBranch
        : null,
  }
}

async function savedValuesDiffer(
  db: D1Database,
  change: RepositoryChange,
  payload: PayloadValues,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT r.id FROM repositories r
       JOIN github_installations i ON i.id = r.installation_id AND i.suspended_at IS NULL
       JOIN orgs o ON o.id = r.org_id AND o.deleted_at IS NULL
       WHERE r.github_repository_id = ? AND r.installation_id = ?
       AND ((? IS NOT NULL AND r.full_name != ?)
         OR (? IS NOT NULL AND r.default_branch != ?))
       LIMIT 1`,
    )
    .bind(
      change.repositoryId,
      change.installationId,
      payload.fullName,
      payload.fullName,
      payload.defaultBranch,
      payload.defaultBranch,
    )
    .first<{ id: string }>()
  return row !== null
}

/**
 * Push, pull request, check, and status webhooks also carry the name and
 * the default branch of their repository. When they differ from the saved
 * values, a repository webhook may have been missed. So this reads GitHub,
 * saves through the guarded writer, and wakes the image coordinators, as
 * the repository webhook does. A failure only warns, because the original
 * event must still complete, and the next webhook checks again.
 */
export async function checkRepositoryValues(
  db: D1Database,
  change: RepositoryChange,
  value: unknown,
  dependencies: RepositoryChangeDependencies | undefined,
): Promise<void> {
  if (!dependencies) return
  const payload = payloadValues(value)
  if (payload.fullName === null && payload.defaultBranch === null) return
  try {
    if (!(await savedValuesDiffer(db, change, payload))) return
    await syncRepositoryValues(db, change, () => dependencies.read(change))
    await dependencies.changed(change)
  } catch {
    warnWorker({ kind: 'repository_values_check_failed' })
  }
}
