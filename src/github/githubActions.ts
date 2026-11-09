import { githubPaths, type GitHubMergeRequest } from '../shared/github'
import type { FetchLike, WorkspaceTarget } from './githubClient'
import {
  actionRecord,
  readCapabilities,
  readMergeResponse,
} from './githubActionParse'

export class GitHubActionError extends Error {
  readonly code: string | null
  constructor(code: string | null, message: string) {
    super(message)
    this.code = code
    this.name = 'GitHubActionError'
  }
}

export function createGitHubActions(fetch: FetchLike, target: WorkspaceTarget) {
  const { orgId, workspaceId } = target
  const request = async <T>(
    path: string,
    parse: (value: unknown) => T | null,
    signal?: AbortSignal,
    body?: GitHubMergeRequest,
  ): Promise<T> => {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      signal,
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const value: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const error = actionRecord(actionRecord(value)?.error)
      throw new GitHubActionError(
        typeof error?.code === 'string' ? error.code : null,
        typeof error?.message === 'string'
          ? error.message
          : 'The GitHub action did not finish. Try again.',
      )
    }
    const parsed = parse(value)
    if (parsed === null)
      throw new GitHubActionError(
        null,
        'The GitHub action did not finish. Try again.',
      )
    return parsed
  }
  return {
    capabilities: (signal?: AbortSignal) =>
      request(
        githubPaths.capabilities(orgId, workspaceId),
        readCapabilities,
        signal,
      ),
    merge: (body: GitHubMergeRequest, signal?: AbortSignal) =>
      request(
        githubPaths.merge(orgId, workspaceId),
        readMergeResponse,
        signal,
        body,
      ),
    mergeResult: (mergeId: string, signal?: AbortSignal) =>
      request(
        githubPaths.mergeResult(orgId, workspaceId, mergeId),
        readMergeResponse,
        signal,
      ),
  }
}
