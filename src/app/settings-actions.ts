import { repositoryPath, type Repository } from '../shared/org-settings'
import { readRepositories } from './api/read-settings'
import type { OrgModel } from './org-model'

/**
 * Adds or removes one repository of the org. Queued changes keep their
 * order. An add starts a build, and each change changes the repositories
 * that the org image lacks or still holds, so the builds read again after
 * the save: the new build and the repository notice show at once.
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
  void org.reload('builds')
}
