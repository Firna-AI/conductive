import type { HttpFetch } from '../env'
import { readBoundedBody } from '../http/bounded-body'
import { githubFailure, object } from './parsers'

export const GITHUB_API_VERSION = '2026-03-10'
const BODY_BUDGET = 26 * 1024 * 1024

export function githubRequest(
  path: string,
  token: string,
  init: RequestInit = {},
): Request {
  return new Request(`https://api.github.com${path}`, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(30_000),
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Conducting',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    },
  })
}

export async function githubJson(
  fetch: HttpFetch,
  request: Request,
): Promise<unknown> {
  try {
    const response = await fetch(request)
    if (!response.ok) {
      void response.body?.cancel().catch(() => undefined)
      throw githubFailure()
    }
    const body =
      response.body === null
        ? new Uint8Array(0)
        : await readBoundedBody(response.body, BODY_BUDGET)
    return JSON.parse(new TextDecoder().decode(body))
  } catch {
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
