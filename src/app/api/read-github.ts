import type {
  GitHubInstallation,
  GitHubInstallationsResponse,
  GitHubRepositoriesResponse,
  GitHubRepository,
} from '../../shared/account'
import { count, items, record, text } from './parse'

function readInstallation(value: unknown): GitHubInstallation {
  const installation = record(value, 'installation')
  return {
    id: count(installation, 'id'),
    account: text(installation, 'account'),
    repositoryCount: count(installation, 'repositoryCount'),
    settingsUrl: text(installation, 'settingsUrl'),
  }
}

export function readInstallations(value: unknown): GitHubInstallationsResponse {
  const body = record(value, 'installations')
  return {
    installations: items(body, 'installations', readInstallation),
    installUrl: text(body, 'installUrl'),
  }
}

function readGitHubRepository(value: unknown): GitHubRepository {
  const repository = record(value, 'repository')
  return {
    githubId: count(repository, 'githubId'),
    fullName: text(repository, 'fullName'),
    description: text(repository, 'description'),
    defaultBranch: text(repository, 'defaultBranch'),
    installationId: count(repository, 'installationId'),
  }
}

/** The repositories that the person and the GitHub App both reach. */
export function readGitHubRepositories(
  value: unknown,
): GitHubRepositoriesResponse {
  const body = record(value, 'repositories')
  return { repositories: items(body, 'repositories', readGitHubRepository) }
}
