import type { HttpFetch } from '../env'
import { readBoundedBody } from '../http/bounded-body'
import {
  outboundRequest,
  type OutboundRequestOptions,
} from '../http/outbound-request'
import { githubFailure, GitHubRequestError, object } from './parsers'

const GITHUB_API_VERSION = '2026-03-10'
export const GITHUB_API_BODY_BYTES = 26 * 1024 * 1024

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
      const body =
        response.body === null
          ? new Uint8Array(0)
          : await readBoundedBody(response.body, GITHUB_API_BODY_BYTES)
      return JSON.parse(new TextDecoder().decode(body))
    })
  } catch (error) {
    if (error instanceof GitHubRequestError) throw error
    throw githubFailure()
  }
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
