import type { HttpFetch } from '../env'
import { isRecord } from '../http'
import { warnWorker } from '../warnings'
import {
  installationAccessToken,
  revokeInstallationAccessToken,
} from './app-credentials'
import { githubJson, githubRequest } from './transport'

/** The values of a repository that the app saves for each org. */
export interface GitHubRepositoryValues {
  fullName: string
  defaultBranch: string
}

function unavailable(): Error {
  return new Error('Repository metadata is not available')
}

/** GitHub names a repository as `owner/name`. A branch name has no whitespace. */
function readRepositoryValues(value: unknown): GitHubRepositoryValues {
  if (
    !isRecord(value) ||
    typeof value.full_name !== 'string' ||
    !/^[^/\s]+\/[^/\s]+$/u.test(value.full_name) ||
    typeof value.default_branch !== 'string' ||
    !/^\S+$/u.test(value.default_branch)
  )
    throw unavailable()
  return { fullName: value.full_name, defaultBranch: value.default_branch }
}

/**
 * Reads the current name and default branch of one repository, with a
 * metadata token of its installation. A webhook can arrive late or again,
 * so the caller saves these values and not the values of the event.
 */
export async function readGitHubRepository(
  dependencies: { fetch: HttpFetch; now: () => number },
  identity: { clientId: string; privateKey: string },
  repository: { repositoryId: number; installationId: number },
): Promise<GitHubRepositoryValues> {
  const token = await installationAccessToken(
    identity,
    {
      installationId: repository.installationId,
      repositoryIds: [repository.repositoryId],
      permissions: { metadata: 'read' },
    },
    { ...dependencies, failure: unavailable },
  )
  try {
    return readRepositoryValues(
      await githubJson(
        dependencies.fetch,
        githubRequest(`/repositories/${repository.repositoryId}`, token),
      ),
    )
  } finally {
    try {
      await revokeInstallationAccessToken(dependencies.fetch, token, () =>
        unavailable(),
      )
    } catch {
      warnWorker({ kind: 'github_repository_token_revoke_failed' })
    }
  }
}
