import { repositoryPath, type Repository } from '../shared/org-settings'
import { readRepositories } from './api/read-settings'
import type { OrgModel } from './org-model'

/**
 * Adds or removes one repository of the org. Queued changes keep their
 * order, and each change takes effect at the next build.
 */
export async function setRepositorySelected(
  org: OrgModel,
  repository: Repository,
  selected: boolean,
): Promise<void> {
  await org.resources.repositories.save(() =>
    org.services.api.send(
      selected ? 'PUT' : 'DELETE',
      repositoryPath(org.orgId, repository.id),
      {},
      readRepositories,
    ),
  )
}
