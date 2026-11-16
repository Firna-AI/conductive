import { readRepositories } from './settings-data'
import {
  capturedRepositoryLocations,
  legacyRepositoryLocations,
  readRepositoryLocations,
  repositoryLocation,
  type RepositoryLocation,
} from './repository-locations'

const MISSING_FOLDERS = 'Missing workspace repository folders'

/** The workspace captures its image folders once. Resume never reads the picker. */
export async function workspaceRepositoryLocations(
  db: D1Database,
  workspaceId: string,
): Promise<RepositoryLocation[]> {
  const row = await db
    .prepare(
      `SELECT r.repository_locations_json AS locationsJson, w.repository_id AS repositoryId,
      w.org_id AS orgId, repository.full_name AS fullName, repository.default_branch AS defaultBranch,
      p.repositories_json AS repositoriesJson, p.repository_locations_json AS plannedLocationsJson
    FROM workspace_runtime r JOIN workspaces w ON w.id = r.workspace_id
    JOIN repositories repository ON repository.id = w.repository_id
    LEFT JOIN workspace_creation_plans p ON p.workspace_id = r.workspace_id
    WHERE r.workspace_id = ?`,
    )
    .bind(workspaceId)
    .first<{
      locationsJson: string | null
      repositoryId: string
      orgId: string
      fullName: string
      defaultBranch: string
      repositoriesJson: string | null
      plannedLocationsJson: string | null
    }>()
  if (!row) throw new Error(MISSING_FOLDERS)
  if (row.locationsJson !== null)
    return readRepositoryLocations(JSON.parse(row.locationsJson))
  if (row.repositoriesJson !== null)
    return capturedRepositoryLocations(
      row.plannedLocationsJson,
      readRepositories(JSON.parse(row.repositoriesJson)),
    )
  return legacyRepositoryLocations([
    {
      id: row.repositoryId,
      orgId: row.orgId,
      fullName: row.fullName,
      defaultBranch: row.defaultBranch,
    },
  ])
}

/**
 * The stored folders of a workspace, or null while it has none, such as
 * before its first start. Any other failure warns and also gives null, so
 * its callers go on without the folders.
 */
export async function storedRepositoryLocations(
  db: D1Database,
  workspaceId: string,
): Promise<RepositoryLocation[] | null> {
  try {
    return await workspaceRepositoryLocations(db, workspaceId)
  } catch (error) {
    if (!(error instanceof Error && error.message === MISSING_FOLDERS))
      console.warn('Unreadable repository folder', error)
    return null
  }
}

/**
 * The folder of the workspace's own repository in its cloud computer, for
 * the chat, which reads paths under it as files of the tree. Null while the
 * workspace has no stored folders, such as before its first start.
 */
export async function workspaceRepositoryFolder(
  db: D1Database,
  workspace: { id: string; repositoryId: string },
): Promise<string | null> {
  const locations = await storedRepositoryLocations(db, workspace.id)
  if (!locations) return null
  try {
    return repositoryLocation(locations, workspace.repositoryId)
  } catch (error) {
    // A missing folder only costs the chips of absolute paths, so the
    // reply goes on.
    console.warn('Unreadable repository folder', error)
    return null
  }
}
