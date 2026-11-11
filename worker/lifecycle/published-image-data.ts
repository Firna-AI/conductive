import { activeOrgIdPredicate } from '../data/org-access'
import { HttpError } from '../http'
import { DEFAULT_PROVIDER_ACCOUNT } from '../sandbox/account-identity'
import { runningBuild } from './build-data'
import { readSavedScript, type SavedScript } from './saved-script'
import { readRepositories, type SelectedRepository } from './settings-data'
import {
  capturedRepositoryLocations,
  type RepositoryLocation,
} from './repository-locations'

/** The account's image pointer and snapshot identify one completed publication. */
export const publishedImageSource = `FROM settings s
  JOIN org_images i ON i.org_id = s.org_id
  JOIN image_builds b ON b.id = i.image_build_id AND b.org_id = i.org_id
    AND b.provider_account = i.provider_account
    AND b.snapshot_name = i.image_name AND b.state = 'succeeded'
  JOIN image_build_jobs j ON j.build_id = b.id`

export const publishedRepositorySource = `${publishedImageSource}
  JOIN json_each(j.repositories_json) repository
  WHERE s.org_id = ? AND i.provider_account = ?
    AND json_extract(repository.value, '$.id') = ?
    AND json_extract(repository.value, '$.orgId') = s.org_id
    AND ${activeOrgIdPredicate('s.org_id')}`

export type ImageAdmissionFailure = 'image_required' | 'repository_not_found'

export async function imageAdmissionError(
  db: D1Database,
  orgId: string,
  code: ImageAdmissionFailure,
  repositoryId?: string,
): Promise<HttpError> {
  if (code === 'image_required')
    return new HttpError(
      409,
      code,
      (await runningBuild(db, orgId))
        ? 'The cloud computer is still being prepared.'
        : 'The cloud computer needs a build. Ask an org admin to build it.',
    )
  const selected = await db
    .prepare(
      'SELECT id FROM repositories WHERE org_id = ? AND id = ? AND selected = 1',
    )
    .bind(orgId, repositoryId ?? null)
    .first<{ id: string }>()
  return new HttpError(
    404,
    code,
    selected
      ? 'The repository is ready after the next build.'
      : 'The repository is not available.',
  )
}

export async function readImageRepositories(
  db: D1Database,
  orgId: string,
  providerAccount = DEFAULT_PROVIDER_ACCOUNT,
): Promise<SelectedRepository[]> {
  const image = await db
    .prepare(
      `SELECT j.repositories_json AS repositoriesJson
       ${publishedImageSource} WHERE s.org_id = ? AND i.provider_account = ?`,
    )
    .bind(orgId, providerAccount)
    .first<{ repositoriesJson: string }>()
  if (!image) throw await imageAdmissionError(db, orgId, 'image_required')
  return readRepositories(JSON.parse(image.repositoriesJson)).filter(
    (repository) => repository.orgId === orgId,
  )
}

export async function readCreationImage(
  db: D1Database,
  orgId: string,
  repositoryId: string,
  providerAccount = DEFAULT_PROVIDER_ACCOUNT,
): Promise<{
  imageName: string
  providerAccount: string
  startupScript: SavedScript
  environmentCiphertext: string | null
  repository: SelectedRepository
  repositoryLocations: RepositoryLocation[]
}> {
  const image = await db
    .prepare(
      `SELECT b.snapshot_name AS imageName, b.provider_account AS providerAccount,
       j.repositories_json AS repositoriesJson,
       j.repository_locations_json AS repositoryLocationsJson,
       s.startup_script AS startupScript, s.env_vars_ciphertext AS environmentCiphertext
       ${publishedImageSource} WHERE s.org_id = ? AND i.provider_account = ?`,
    )
    .bind(orgId, providerAccount)
    .first<{
      imageName: string
      providerAccount: string
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
    throw await imageAdmissionError(
      db,
      orgId,
      'repository_not_found',
      repositoryId,
    )
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
