import type { HttpFetch } from '../../env'
import {
  installationAccessToken,
  revokeInstallationAccessToken,
} from '../../github/app-credentials'
import type { SourceRepository } from './data'
import type { MetadataBatch } from './metadata-plan'

export function installationToken(
  fetch: HttpFetch,
  clientId: string,
  privateKey: string,
  repository: SourceRepository,
  now: () => number,
): Promise<string> {
  return installationAccessToken(
    { clientId, privateKey },
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

export function metadataInstallationToken(
  fetch: HttpFetch,
  clientId: string,
  privateKey: string,
  batch: MetadataBatch,
  now: () => number,
): Promise<string> {
  return installationAccessToken(
    { clientId, privateKey },
    {
      installationId: batch.installationId,
      repositoryIds: batch.repositories.map(
        (repository) => repository.githubRepositoryId,
      ),
      permissions: { metadata: 'read' },
    },
    {
      fetch,
      now,
      failure: () => new Error('Repository metadata is not available'),
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
