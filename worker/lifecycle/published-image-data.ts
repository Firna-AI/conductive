import { activeOrgIdPredicate } from '../data/org-access'
import { HttpError } from '../http'
import { runningBuild } from './build-data'
import { readSavedScript, type SavedScript } from './saved-script'
import { readRepositories, type SelectedRepository } from './settings-data'
import {
  capturedRepositoryLocations,
  type RepositoryLocation,
} from './repository-locations'

/** The settings pointer and snapshot must identify one completed publication. */
export const publishedImageSource = `FROM settings s
  JOIN image_builds b ON b.id = s.image_build_id AND b.org_id = s.org_id
    AND b.snapshot_name = s.org_image_name AND b.state = 'succeeded'
  JOIN image_build_jobs j ON j.build_id = b.id`

export const publishedRepositorySource = `${publishedImageSource}
  JOIN json_each(j.repositories_json) repository
  WHERE s.org_id = ? AND json_extract(repository.value, '$.id') = ?
    AND json_extract(repository.value, '$.orgId') = s.org_id
    AND ${activeOrgIdPredicate('s.org_id')}`

export type ImageAdmissionFailure = 'image_required' | 'repository_not_found'

export async function imageAdmissionError(
  db: D1Database,
  orgId: string,
  code: ImageAdmissionFailure,
): Promise<HttpError> {
  return code === 'image_required'
    ? new HttpError(
        409,
        code,
        (await runningBuild(db, orgId))
          ? 'The cloud computer is still being prepared.'
          : 'The cloud computer needs a build. Ask an org admin to build it.',
      )
    : new HttpError(404, code, 'The repository is not available.')
}

export async function readCreationImage(
  db: D1Database,
  orgId: string,
  repositoryId: string,
): Promise<{
  imageName: string
  startupScript: SavedScript
  environmentCiphertext: string | null
  repository: SelectedRepository
  repositoryLocations: RepositoryLocation[]
}> {
  const image = await db
    .prepare(
      `SELECT b.snapshot_name AS imageName, j.repositories_json AS repositoriesJson,
       j.repository_locations_json AS repositoryLocationsJson,
       s.startup_script AS startupScript, s.env_vars_ciphertext AS environmentCiphertext
       ${publishedImageSource} WHERE s.org_id = ?`,
    )
    .bind(orgId)
    .first<{
      imageName: string
      repositoriesJson: string
      repositoryLocationsJson: string | null
      startupScript: string
      environmentCiphertext: string | null
    }>()
  if (!image) throw await imageAdmissionError(db, orgId, 'image_required')
  const repositories = readRepositories(JSON.parse(image.repositoriesJson))
  const repository = repositories.find(
    (entry) => entry.id === repositoryId && entry.orgId === orgId,
  )
  if (!repository)
    throw await imageAdmissionError(db, orgId, 'repository_not_found')
  return {
    ...image,
    startupScript: readSavedScript(image.startupScript),
    repository,
    repositoryLocations: capturedRepositoryLocations(
      image.repositoryLocationsJson,
      repositories,
    ),
  }
}
