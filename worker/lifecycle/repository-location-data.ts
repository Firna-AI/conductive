import { readRepositories } from './settings-data'
import {
  capturedRepositoryLocations,
  legacyRepositoryLocations,
  readRepositoryLocations,
  repositoryLocation,
  type RepositoryLocation,
} from './repository-locations'

const MISSING_FOLDERS = 'Missing workspace repository folders'

interface LocationRow {
  locationsJson: string | null
  repositoryId: string
  orgId: string
  sandboxId: string | null
  providerAccount: string
  fullName: string
  defaultBranch: string
  repositoriesJson: string | null
  plannedLocationsJson: string | null
}

async function readLocationRow(
  db: D1Database,
  workspaceId: string,
): Promise<LocationRow> {
  const row = await db
    .prepare(
      `SELECT r.repository_locations_json AS locationsJson, w.repository_id AS repositoryId,
      w.org_id AS orgId, w.sandbox_id AS sandboxId, w.provider_account AS providerAccount,
      repository.full_name AS fullName, repository.default_branch AS defaultBranch,
      p.repositories_json AS repositoriesJson, p.repository_locations_json AS plannedLocationsJson
    FROM workspace_runtime r JOIN workspaces w ON w.id = r.workspace_id
    JOIN repositories repository ON repository.id = w.repository_id
    LEFT JOIN workspace_creation_plans p ON p.workspace_id = r.workspace_id
    WHERE r.workspace_id = ?`,
    )
    .bind(workspaceId)
    .first<LocationRow>()
  if (!row) throw new Error(MISSING_FOLDERS)
  return row
}

function recordedLocations(row: LocationRow): RepositoryLocation[] | null {
  if (row.locationsJson !== null)
    return readRepositoryLocations(JSON.parse(row.locationsJson))
  if (row.repositoriesJson !== null)
    return capturedRepositoryLocations(
      row.plannedLocationsJson,
      readRepositories(JSON.parse(row.repositoriesJson)),
    )
  return null
}

/** The workspace captures its image folders once. Resume never reads the picker. */
export async function workspaceRepositoryLocations(
  db: D1Database,
  workspaceId: string,
): Promise<RepositoryLocation[]> {
  const row = await readLocationRow(db, workspaceId)
  return (
    recordedLocations(row) ??
    legacyRepositoryLocations([
      {
        id: row.repositoryId,
        orgId: row.orgId,
        fullName: row.fullName,
        defaultBranch: row.defaultBranch,
      },
    ])
  )
}

/**
 * The recorded folders of a workspace, or null for a workspace with no
 * record of its folders, such as one created before 7 November 2026. Its
 * folders then come only from its current repository.
 */
export async function recordedRepositoryLocations(
  db: D1Database,
  workspaceId: string,
): Promise<RepositoryLocation[] | null> {
  return recordedLocations(await readLocationRow(db, workspaceId))
}

/** Append a completed clone once, or return false if the workspace changed sandboxes. */
export async function recordClonedRepositoryLocation(
  db: D1Database,
  workspace: { id: string; sandboxId: string; providerAccount: string },
  location: RepositoryLocation,
): Promise<boolean> {
  const row = await readLocationRow(db, workspace.id)
  if (
    row.sandboxId !== workspace.sandboxId ||
    row.providerAccount !== workspace.providerAccount
  )
    return false
  const locations = recordedLocations(row)
  if (!locations) throw new Error(MISSING_FOLDERS)
  const existing = locations.find(
    ({ repositoryId }) => repositoryId === location.repositoryId,
  )
  if (existing) {
    if (
      existing.directory === location.directory &&
      existing.variable === location.variable
    )
      return true
    throw new Error('The cloned repository folder conflicts with its record.')
  }
  const updated = readRepositoryLocations([...locations, location])
  const result = await db
    .prepare(
      `UPDATE workspace_runtime SET repository_locations_json = ?
      WHERE workspace_id = ? AND repository_locations_json IS ?
      AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_runtime.workspace_id
        AND w.sandbox_id = ? AND w.provider_account = ?)`,
    )
    .bind(
      JSON.stringify(updated),
      workspace.id,
      row.locationsJson,
      workspace.sandboxId,
      workspace.providerAccount,
    )
    .run()
  if (result.meta.changes !== 1)
    throw new Error('The workspace folder record changed during the move.')
  return true
}

/**
 * The repositories that the sandbox of a workspace holds, by ID, for the
 * repository menu. Null when the workspace has no record of its folders, or
 * no folders yet. A failed read warns and also gives null.
 */
export async function heldRepositoryIds(
  db: D1Database,
  workspaceId: string,
): Promise<string[] | null> {
  try {
    const locations = await recordedRepositoryLocations(db, workspaceId)
    return locations && locations.map((location) => location.repositoryId)
  } catch (error) {
    if (!(error instanceof Error && error.message === MISSING_FOLDERS))
      console.warn('Unreadable repository folder', error)
    return null
  }
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
