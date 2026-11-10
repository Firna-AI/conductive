import {
  publishedRepositorySource,
  readCreationImage,
  imageAdmissionError,
} from './published-image-data'
import { readRepositories } from './settings-data'
import { capturedRepositoryLocations } from './repository-locations'
import { readSavedScript } from './saved-script'
import { importActivationGuard } from './import-activation-data'
import { readWorkspace, type WorkspaceRow } from './workspace-data'
import { requireActiveWorkspaceOwner } from '../data/user-access'
import { requireOrgMember } from './access'
import { HttpError } from '../http'

interface CapturedImage {
  imageName: string
  providerAccount: string
  repositoriesJson: string
  repositoryLocationsJson: string | null
  startupScript: string
  environmentCiphertext: string | null
}

/** A publication race selects the publication present when the lease is written. */
export async function pinImportImage(
  db: D1Database,
  row: WorkspaceRow,
  userId: string,
) {
  await readCreationImage(db, row.orgId, row.repositoryId, row.providerAccount)
  const captured = await db.batch<CapturedImage>([
    db
      .prepare(
        `INSERT OR REPLACE INTO workspace_import_image_leases
      (workspace_id, org_id, snapshot_name, provider_account)
      SELECT ?, s.org_id, b.snapshot_name, b.provider_account ${publishedRepositorySource}
      AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = ? AND w.org_id = s.org_id AND ${importActivationGuard})`,
      )
      .bind(
        row.id,
        row.orgId,
        row.providerAccount,
        row.repositoryId,
        row.id,
        userId,
      ),
    db
      .prepare(
        `SELECT l.snapshot_name AS imageName, l.provider_account AS providerAccount,
      j.repositories_json AS repositoriesJson, j.repository_locations_json AS repositoryLocationsJson,
      s.startup_script AS startupScript, s.env_vars_ciphertext AS environmentCiphertext
      FROM workspace_import_image_leases l JOIN image_builds b ON b.org_id = l.org_id
        AND b.snapshot_name = l.snapshot_name AND b.provider_account = l.provider_account AND b.state = 'succeeded'
      JOIN image_build_jobs j ON j.build_id = b.id JOIN settings s ON s.org_id = l.org_id
      WHERE l.workspace_id = ? AND l.org_id = ?`,
      )
      .bind(row.id, row.orgId),
  ])
  await requireOrgMember(db, row.orgId, userId)
  const current = await readWorkspace(db, row.orgId, row.id)
  await requireActiveWorkspaceOwner(db, current.ownerUserId, row.orgId)
  if (current.archivedAt !== null)
    throw new HttpError(
      409,
      'workspace_archived',
      'The archived workspace cannot start.',
    )
  const image = captured[0].meta.changes ? captured[1].results[0] : undefined
  if (!image)
    throw await imageAdmissionError(
      db,
      row.orgId,
      'repository_not_found',
      row.repositoryId,
    )
  const repositories = readRepositories(JSON.parse(image.repositoriesJson))
  const repository = repositories.find(
    (entry) => entry.id === row.repositoryId && entry.orgId === row.orgId,
  )
  if (!repository)
    throw await imageAdmissionError(
      db,
      row.orgId,
      'repository_not_found',
      row.repositoryId,
    )
  const repositoryLocations = capturedRepositoryLocations(
    image.repositoryLocationsJson,
    repositories,
  )
  await db
    .prepare(
      `UPDATE workspace_runtime SET repository_locations_json = ? WHERE workspace_id = ?
    AND EXISTS (SELECT 1 FROM workspace_import_image_leases l WHERE l.workspace_id = ? AND l.snapshot_name = ? AND l.provider_account = ?)
    AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_runtime.workspace_id AND ${importActivationGuard})`,
    )
    .bind(
      JSON.stringify(repositoryLocations),
      row.id,
      row.id,
      image.imageName,
      image.providerAccount,
      userId,
    )
    .run()
  return {
    ...image,
    repository,
    repositoryLocations,
    startupScript: readSavedScript(image.startupScript),
  }
}
