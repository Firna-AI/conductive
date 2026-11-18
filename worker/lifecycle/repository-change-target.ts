import { HttpError } from '../http'
import { recordedRepositoryLocations } from './repository-location-data'
import type { RepositoryLocation } from './repository-locations'

/** A chosen repository of the org, with an installation that is not suspended. */
export interface ChosenRepository {
  id: string
  githubRepositoryId: number
  fullName: string
  defaultBranch: string
  installationId: number
}

function repositoryUnavailable(): HttpError {
  return new HttpError(
    404,
    'repository_unavailable',
    "This cloud computer doesn't have this repository. Create a new workspace to use it.",
  )
}

export async function readChosenRepository(
  db: D1Database,
  orgId: string,
  repositoryId: string,
): Promise<ChosenRepository> {
  const row = await db
    .prepare(
      `SELECT r.id, r.github_repository_id AS githubRepositoryId, r.full_name AS fullName,
      r.default_branch AS defaultBranch, r.installation_id AS installationId
    FROM repositories r JOIN github_installations i ON i.id = r.installation_id
    WHERE r.org_id = ? AND r.id = ? AND r.selected = 1 AND i.suspended_at IS NULL`,
    )
    .bind(orgId, repositoryId)
    .first<ChosenRepository>()
  if (!row) throw repositoryUnavailable()
  return row
}

/**
 * The folders of the old and the new repository. Only a workspace with a
 * record of its folders can change, as repository change decision 4 G
 * says: without the record, the Worker knows no other folder.
 */
export async function changeFolders(
  db: D1Database,
  workspaceId: string,
  oldRepositoryId: string,
  newRepositoryId: string,
): Promise<{ directory: string; targetDirectory: string }> {
  const locations = await recordedRepositoryLocations(db, workspaceId)
  const folder = (id: string, all: readonly RepositoryLocation[]) =>
    all.find((location) => location.repositoryId === id)?.directory
  const directory = locations && folder(oldRepositoryId, locations)
  const targetDirectory = locations && folder(newRepositoryId, locations)
  if (!directory || !targetDirectory || directory === targetDirectory)
    throw repositoryUnavailable()
  return { directory, targetDirectory }
}
