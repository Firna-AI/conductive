import type { HttpFetch } from '../../env'
import {
  installationAccessToken,
  revokeInstallationAccessToken,
} from '../../github/app-credentials'
import type { SourceRepository } from './data'

export function installationToken(
  fetch: HttpFetch,
  clientId: string,
  key: string | CryptoKey,
  repository: SourceRepository,
  now: () => number = Date.now,
): Promise<string> {
  return installationAccessToken(
    { clientId, privateKey: key },
    {
      installationId: repository.installationId,
      repositoryIds: [repository.githubRepositoryId],
      permissions: { contents: 'read' },
    },
    {
      fetch,
      now,
      failure: () => new Error('Installation access is not available'),
    },
  )
}

export function revokeInstallationToken(
  fetch: HttpFetch,
  token: string,
): Promise<void> {
  return revokeInstallationAccessToken(
    fetch,
    token,
    () => new Error('Installation access could not be revoked'),
  )
}
