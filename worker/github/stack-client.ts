import type { HttpFetch } from '../env'
import {
  parseGitHubStack,
  parseGitHubStackList,
  type GitHubStack,
  type GitHubStackLayer,
} from './stack-parsers'
import {
  githubActionJson,
  githubRepositoryPath,
  githubRequest,
} from './transport'

export async function listPullRequestStacks(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  pullNumber: number,
): Promise<GitHubStack<GitHubStackLayer>[]> {
  const path = `${githubRepositoryPath(fullName)}/stacks?pull_request=${pullNumber}`
  return parseGitHubStackList(
    await githubActionJson(fetch, githubRequest(path, token), [200]),
  )
}

export async function getPullRequestStack(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  stackNumber: number,
): Promise<GitHubStack> {
  const path = `${githubRepositoryPath(fullName)}/stacks/${stackNumber}`
  return parseGitHubStack(
    await githubActionJson(fetch, githubRequest(path, token), [200]),
  )
}

function writeStack(
  fetch: HttpFetch,
  token: string,
  path: string,
  pullNumbers: readonly number[],
  successStatus: number,
): Promise<unknown> {
  return githubActionJson(
    fetch,
    githubRequest(path, token, {
      method: 'POST',
      body: JSON.stringify({ pull_requests: pullNumbers }),
    }),
    [successStatus],
  )
}

export async function createPullRequestStack(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  pullNumbers: readonly number[],
): Promise<GitHubStack> {
  const path = `${githubRepositoryPath(fullName)}/stacks`
  return parseGitHubStack(
    await writeStack(fetch, token, path, pullNumbers, 201),
  )
}

export async function addPullRequestsToStack(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  stackNumber: number,
  pullNumbers: readonly number[],
): Promise<GitHubStack> {
  const path = `${githubRepositoryPath(fullName)}/stacks/${stackNumber}/add`
  return parseGitHubStack(
    await writeStack(fetch, token, path, pullNumbers, 200),
  )
}

export async function unstackPullRequests(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  stackNumber: number,
): Promise<GitHubStack | null> {
  const path = `${githubRepositoryPath(fullName)}/stacks/${stackNumber}/unstack`
  const result = await githubActionJson(
    fetch,
    githubRequest(path, token, { method: 'POST' }),
    [200, 204],
  )
  return result === undefined ? null : parseGitHubStack(result)
}
