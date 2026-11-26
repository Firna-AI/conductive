import { HttpError } from '../http'
import { recordedRepositoryLocations } from './repository-location-data'
import { addedRepositoryLocation } from './repository-locations'

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

/** Find the two folders, or allocate a location for a chosen repository to clone. */
export async function changeFolders(
  db: D1Database,
  workspaceId: string,
  oldRepositoryId: string,
  target: Pick<ChosenRepository, 'id' | 'fullName'>,
  diskNames?: readonly string[],
  runningVariables?: readonly string[],
): Promise<{
  directory: string
  targetDirectory: string
  clone?: { variable: string }
}> {
  const locations = await recordedRepositoryLocations(db, workspaceId)
  if (!locations) throw repositoryUnavailable()
  const directory = locations.find(
    (location) => location.repositoryId === oldRepositoryId,
  )?.directory
  const targetDirectory = locations.find(
    (location) => location.repositoryId === target.id,
  )?.directory
  if (!directory || directory === targetDirectory) throw repositoryUnavailable()
  if (targetDirectory) return { directory, targetDirectory }
  const clone = addedRepositoryLocation(
    target,
    locations,
    diskNames,
    runningVariables,
  )
  return {
    directory,
    targetDirectory: clone.directory,
    clone: { variable: clone.variable },
  }
}
