import type { HttpFetch } from '../env'
import { HttpError } from '../http'
import { readBoundedJson } from '../http/bounded-body'
import {
  outboundRequest,
  type OutboundRequestOptions,
} from '../http/outbound-request'
import { githubFailure, GitHubRequestError, object } from './parsers'

const GITHUB_API_VERSION = '2026-03-10'
export const GITHUB_API_BODY_BYTES = 26 * 1024 * 1024

export function githubRepositoryPath(fullName: string): string {
  return `/repos/${fullName.split('/').map(encodeURIComponent).join('/')}`
}

export function githubRequest(
  path: string,
  token: string,
  init: OutboundRequestOptions = {},
): Request {
  return outboundRequest(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    },
  })
}

/** Keep the deadline through body reads, then release its pending timer. */
export async function withGitHubResponse<T>(
  fetch: HttpFetch,
  request: Request,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  const signal = AbortSignal.any([request.signal, controller.signal])
  try {
    return await read(await fetch(new Request(request, { signal })))
  } finally {
    clearTimeout(timer)
  }
}

export async function githubJson(
  fetch: HttpFetch,
  request: Request,
): Promise<unknown> {
  try {
    return await withGitHubResponse(fetch, request, async (response) => {
      if (!response.ok) {
        void response.body?.cancel().catch(() => undefined)
        throw githubFailure(response.status)
      }
      return readBoundedJson(response.body, GITHUB_API_BODY_BYTES)
    })
  } catch (error) {
    if (error instanceof GitHubRequestError) throw error
    throw githubFailure()
  }
}

function githubActionFailure(status: number): HttpError {
  switch (status) {
    case 401:
    case 403:
      return new HttpError(
        403,
        'github_access_required',
        'Your GitHub account cannot access this resource.',
      )
    case 404:
      return new HttpError(
        404,
        'github_not_found',
        'GitHub could not find the requested resource.',
      )
    case 409:
      return new HttpError(
        409,
        'github_conflict',
        'GitHub is processing another change. Try again.',
      )
    case 422:
      return new HttpError(
        422,
        'github_validation_failed',
        'GitHub refused the request.',
      )
    default:
      return githubFailure()
  }
}

/** Read a documented success reply. A 204 resolves without a value. */
export async function githubActionJson(
  fetch: HttpFetch,
  request: Request,
  successStatuses: readonly number[],
): Promise<unknown> {
  const result = await withGitHubResponse(fetch, request, async (response) => {
    if (!successStatuses.includes(response.status)) {
      void response.body?.cancel().catch(() => undefined)
      const rateLimited =
        response.status === 403 &&
        (response.headers.get('x-ratelimit-remaining') === '0' ||
          response.headers.has('retry-after'))
      return {
        error: rateLimited
          ? githubFailure()
          : githubActionFailure(response.status),
      }
    }
    return {
      body:
        response.status === 204
          ? undefined
          : await readBoundedJson(response.body, GITHUB_API_BODY_BYTES),
    }
  }).catch(() => {
    throw githubFailure()
  })
  if (result.error) throw result.error
  return result.body
}

export async function graphql(
  fetch: HttpFetch,
  token: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = object(
    await githubJson(
      fetch,
      githubRequest('/graphql', token, {
        method: 'POST',
        body: JSON.stringify({ query, variables }),
      }),
    ),
  )
  if (result.errors !== undefined) throw githubFailure()
  return object(result.data)
}
