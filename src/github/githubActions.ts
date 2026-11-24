import { githubPaths, type GitHubReadyRequest } from '../shared/github'
import type { GitHubMergeRequest } from '../shared/generated/GitHubMergeRequest'
import {
  loadStoredGitHubState,
  type FetchLike,
  type WorkspaceTarget,
} from './githubClient'
import type { RequestQueueMerge } from '../shared/generated/RequestQueueMerge'
import type { RequestQueueStackMerge } from '../shared/generated/RequestQueueStackMerge'
import { mergeQueuePaths } from '../shared/merge-queue'
import {
  actionRecord,
  readCapabilities,
  readMergeResponse,
  readReadyResponse,
} from './githubActionParse'

/** The safe words of an action that ended with no known result. */
export const unfinishedAction = 'The GitHub action did not finish. Try again.'

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
    body?:
      | GitHubMergeRequest
      | GitHubReadyRequest
      | RequestQueueMerge
      | RequestQueueStackMerge,
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
        typeof error?.message === 'string' ? error.message : unfinishedAction,
      )
    }
    const parsed = parse(value)
    if (parsed === null) throw new GitHubActionError(null, unfinishedAction)
    return parsed
  }
  return {
    stored: (signal: AbortSignal) =>
      loadStoredGitHubState(fetch, target, signal),
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
    mergeQueue: (
      body: RequestQueueMerge | RequestQueueStackMerge,
      signal?: AbortSignal,
    ) =>
      request(
        mergeQueuePaths.merge(orgId, workspaceId),
        () => undefined,
        signal,
        body,
      ),
    /** Marks the draft pull request ready for review, as the member. */
    ready: (body: GitHubReadyRequest, signal?: AbortSignal) =>
      request(
        githubPaths.ready(orgId, workspaceId),
        readReadyResponse,
        signal,
        body,
      ),
  }
}
