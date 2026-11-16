import type { HttpFetch } from '../../env'
import { isRecord } from '../../http'
import { githubJson, githubRequest } from '../../github/transport'
import type { MetadataRepository } from './metadata-plan'

const MINIMUM_SOURCE_MEMORY = 256 * 1024 * 1024

/** Dispatch at most six full reads. Construct each request when its worker is free. */
export async function readMetadataSizes(
  fetch: HttpFetch,
  token: string,
  repositories: readonly MetadataRepository[],
) {
  const estimates = repositories.map((repository) => ({
    sourceIndex: repository.sourceIndex,
    estimateBytes: MINIMUM_SOURCE_MEMORY,
  }))
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(6, repositories.length) }, async () => {
      while (next < repositories.length) {
        const index = next++
        const source = repositories[index]
        const result = await githubJson(
          fetch,
          githubRequest(`/repositories/${source.githubRepositoryId}`, token),
        )
        const size = isRecord(result) ? result.size : null
        estimates[index].estimateBytes =
          typeof size === 'number' && Number.isSafeInteger(size) && size >= 0
            ? Math.max(MINIMUM_SOURCE_MEMORY, size * 2048)
            : MINIMUM_SOURCE_MEMORY
      }
    }),
  )
  return estimates
}
