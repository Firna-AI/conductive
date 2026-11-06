import {
  acmeRepositories,
  newOrg,
} from '../../../docs/mockups/src/fixtures/repositories'
import type { GitHubRepositoriesResponse } from '../../shared/account'
import type { RepositoriesResponse } from '../../shared/org-settings'

export function repositoryFixtures(orgId: string) {
  const acme = acmeRepositories.map((repository, index) => ({
    githubId: index + 1,
    fullName: repository.name,
    description: repository.description,
    defaultBranch: 'main',
    installationId: 1,
  }))
  const githubRepositories: GitHubRepositoriesResponse = {
    repositories: [
      ...acme,
      ...newOrg.repositories.map((repository, index) => ({
        githubId: acme.length + index + 1,
        fullName: repository.name,
        description: repository.description,
        defaultBranch: 'main',
        installationId: 3,
      })),
    ],
  }
  const repositories: RepositoriesResponse = {
    repositories: acme.map((repository, index) => ({
      ...repository,
      id: repository.fullName.split('/')[1],
      orgId,
      selected: acmeRepositories[index].used,
    })),
  }
  return { githubRepositories, repositories }
}
