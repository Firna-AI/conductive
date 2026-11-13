import type { HttpFetch } from '../env'
import { HttpError, isRecord } from '../http'
import { readBoundedBody } from '../http/bounded-body'
import type { BranchRepository } from './branch-data'
import { githubFailure, integer, object } from './parsers'
import {
  GITHUB_API_BODY_BYTES,
  githubRequest,
  withGitHubResponse,
} from './transport'

function githubBranchAccessRequired(): HttpError {
  return new HttpError(
    403,
    'github_access_required',
    'Your GitHub account cannot read this repository.',
  )
}

export async function branchQuery(
  fetch: HttpFetch,
  token: string,
  repository: BranchRepository,
  query: string,
  variables: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const [owner, name] = repository.fullName.split('/')
  try {
    return await withGitHubResponse(
      fetch,
      githubRequest('/graphql', token, {
        method: 'POST',
        body: JSON.stringify({
          query,
          variables: { owner, name, ...variables },
        }),
      }),
      async (response) => {
        if (!response.ok) {
          void response.body?.cancel().catch(() => undefined)
          if (
            response.status === 403 &&
            response.headers.get('x-ratelimit-remaining') !== '0' &&
            !response.headers.has('retry-after')
          )
            throw githubBranchAccessRequired()
          throw githubFailure()
        }
        const bytes =
          response.body === null
            ? new Uint8Array(0)
            : await readBoundedBody(response.body, GITHUB_API_BODY_BYTES)
        const result = object(JSON.parse(new TextDecoder().decode(bytes)))
        if (result.errors !== undefined) {
          if (
            Array.isArray(result.errors) &&
            result.errors.some(
              (error: unknown) =>
                isRecord(error) &&
                (error.type === 'NOT_FOUND' || error.type === 'FORBIDDEN'),
            )
          )
            throw githubBranchAccessRequired()
          throw githubFailure()
        }
        const value = object(result.data).repository
        if (value === null) throw githubBranchAccessRequired()
        const parsed = object(value)
        if (integer(parsed.databaseId) !== repository.githubId)
          throw githubFailure()
        return parsed
      },
    )
  } catch (error) {
    if (error instanceof HttpError && error.code === 'github_access_required')
      throw error
    throw githubFailure()
  }
}
