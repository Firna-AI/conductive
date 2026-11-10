import type { AppEnv, HttpFetch } from '../env'
import { installationAccessToken } from './app-credentials'
import type { GitHubTokenProvider } from './contracts'
import { githubFailure } from './parsers'

export interface GitHubAppCredentials extends Pick<AppEnv, 'GITHUB_CLIENT_ID'> {
  /** GitHub App PEM. This secret stays in the Worker and never reaches a sandbox. */
  GITHUB_APP_PRIVATE_KEY: string
}

/** Narrow installation tokens for server-side reads. No git credential route. */
export function installationTokenProvider(
  env: GitHubAppCredentials,
  fetch: HttpFetch,
  now: () => number,
): GitHubTokenProvider {
  return (workspace) =>
    installationAccessToken(
      {
        clientId: env.GITHUB_CLIENT_ID,
        privateKey: env.GITHUB_APP_PRIVATE_KEY,
      },
      {
        installationId: workspace.installationId,
        repositoryIds: [workspace.repositoryId],
        permissions: {
          contents: 'read',
          pull_requests: 'read',
          checks: 'read',
          statuses: 'read',
        },
      },
      { fetch, now, failure: githubFailure },
    )
}
