import type { HttpFetch } from '../env'
import { githubFailure, object } from './parsers'

export const GITHUB_API_VERSION = '2026-03-10'

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
    if (!response.ok) throw githubFailure()
    return await response.json()
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
