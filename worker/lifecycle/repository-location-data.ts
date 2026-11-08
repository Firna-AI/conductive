import { readRepositories } from './settings-data'
import {
  capturedRepositoryLocations,
  legacyRepositoryLocations,
  readRepositoryLocations,
  type RepositoryLocation,
} from './repository-locations'

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
  if (!row) throw new Error('Missing workspace repository folders')
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
