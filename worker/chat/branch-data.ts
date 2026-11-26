import type { RunnerBranches } from '../../src/shared/generated/RunnerBranches'
import type { RunnerRepository } from '../../src/shared/generated/RunnerRepository'
import { storedRepositoryLocations } from '../lifecycle/repository-location-data'

export function readRunnerBranches(
  db: D1Database,
  workspaceId: string,
): Promise<RunnerBranches | null> {
  return db
    .prepare(
      `SELECT w.branch AS workspaceBranch, COALESCE(w.base_branch, r.default_branch) AS targetBranch
    FROM workspaces w JOIN repositories r ON r.id = w.repository_id AND r.org_id = w.org_id
    WHERE w.id = ?`,
    )
    .bind(workspaceId)
    .first<RunnerBranches>()
}

/** The record repository, and the stored folder of each repository of the sandbox. */
export interface RunnerRepositoryRecord {
  repository: RunnerRepository
  folders: readonly string[]
  variable: string
}

/**
 * The record repository and its folder. The runner must work in this folder.
 * Null while the workspace has no stored folders, so no move can start.
 */
export async function readRunnerRepository(
  db: D1Database,
  workspaceId: string,
): Promise<RunnerRepositoryRecord | null> {
  const row = await db
    .prepare(
      `SELECT w.repository_id AS repositoryId, r.full_name AS fullName
    FROM workspaces w JOIN repositories r ON r.id = w.repository_id AND r.org_id = w.org_id
    WHERE w.id = ?`,
    )
    .bind(workspaceId)
    .first<{ repositoryId: string; fullName: string }>()
  if (!row) return null
  const locations = await storedRepositoryLocations(db, workspaceId)
  const location = locations?.find(
    (location) => location.repositoryId === row.repositoryId,
  )
  if (!locations || !location) return null
  return {
    repository: { fullName: row.fullName, folder: location.directory },
    folders: locations.map((location) => location.directory),
    variable: location.variable,
  }
}
