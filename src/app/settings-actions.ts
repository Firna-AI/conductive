import { boatKeyPath } from '../shared/api'
import { orgSettingsPaths, type Repository } from '../shared/org-settings'
import { ApiError } from './api/client'
import { readBoatKey } from './api/read-core'
import { readRepositories } from './api/read-settings'
import type { OrgModel } from './org-model'
import { valueOf } from './store'

/**
 * Adds or removes a repository of the org. The write names every chosen
 * repository, and the change takes effect at the next build.
 */
export async function setRepositorySelected(
  org: OrgModel,
  repository: Repository,
  selected: boolean,
): Promise<void> {
  const list = valueOf(org.repositories.get()) ?? []
  const ids = list
    .filter((item) => (item.id === repository.id ? selected : item.selected))
    .map((item) => item.githubId)
  await org.resources.repositories.save(() =>
    org.services.api.send(
      'PUT',
      orgSettingsPaths.repositories(org.orgId),
      { githubRepositoryIds: ids },
      readRepositories,
    ),
  )
}

/** Why Boat refused a key, so that the key screen can say what to do. */
export type BoatKeyProblem = 'refused' | 'other-account' | 'unavailable'

export function boatKeyProblem(error: unknown): BoatKeyProblem {
  if (!(error instanceof ApiError)) return 'unavailable'
  if (error.code === 'boat_account_mismatch') return 'other-account'
  if (error.code === 'boat_key_refused') return 'refused'
  return 'unavailable'
}

/**
 * Saves a Boat key. The Worker tests it once, then keeps it encrypted, and
 * answers with the last four characters only. A refused key leaves the
 * saved key as it was.
 */
export async function saveBoatKey(org: OrgModel, key: string): Promise<void> {
  await org.resources.boatKey.save(() =>
    org.services.api.send('PUT', boatKeyPath(org.orgId), { key }, readBoatKey),
  )
}
