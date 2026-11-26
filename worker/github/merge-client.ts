import type { GitHubMergeRequest } from '../../src/shared/generated/GitHubMergeRequest'
import type { GitHubMergeMethod } from '../../src/shared/generated/GitHubMergeMethod'
import type { HttpFetch } from '../env'
import { readBoundedJson } from '../http/bounded-body'
import { choice, githubFailure, object, text } from './parsers'
import {
  GITHUB_API_BODY_BYTES,
  githubRepositoryPath,
  githubRequest,
  withGitHubResponse,
} from './transport'

export type AsyncMergeResult =
  | {
      state: 'pending'
      uuid: string
      method: 'default' | GitHubMergeMethod
      action: 'default' | 'direct_merge' | 'merge_queue'
      headSha: string
      bypass: boolean
    }
  | { state: 'merged' | 'failed' | 'enqueued' }

export function matchesDirectMerge(
  result: Extract<AsyncMergeResult, { state: 'pending' }>,
  input: GitHubMergeRequest,
): boolean {
  return (
    result.method === input.method &&
    result.action === 'direct_merge' &&
    result.headSha === input.headSha &&
    !result.bypass
  )
}

function parseResult(value: unknown): AsyncMergeResult {
  const input = object(value)
  const details = object(input.details)
  text(details.message)
  const state = choice(input.status, [
    'pending',
    'merged',
    'failed',
    'enqueued',
  ])
  if (state === 'pending')
    return {
      state,
      uuid: text(details.uuid),
      method: choice(details.merge_method, [
        'default',
        'merge',
        'squash',
        'rebase',
      ]),
      action: choice(details.merge_action, [
        'default',
        'direct_merge',
        'merge_queue',
      ]),
      headSha: text(details.expected_head_sha),
      bypass: details.bypass_rules === true,
    }
  if (state === 'merged') text(details.sha)
  return { state }
}

export async function requestMerge(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  pullNumber: number,
  input: GitHubMergeRequest | string,
): Promise<{ status: number; result: AsyncMergeResult | null }> {
  const path = `${githubRepositoryPath(fullName)}/pulls/${pullNumber}/merge-async`
  const request =
    typeof input === 'string'
      ? githubRequest(`${path}/${encodeURIComponent(input)}`, token)
      : githubRequest(path, token, {
          method: 'PUT',
          body: JSON.stringify({
            sha: input.headSha,
            merge_method: input.method,
            merge_action: 'direct_merge',
            bypass_rules: false,
          }),
        })
  try {
    return await withGitHubResponse(fetch, request, async (response) => {
      if (![200, 202, 400, 409].includes(response.status)) {
        void response.body?.cancel().catch(() => undefined)
        if (response.status >= 500) throw githubFailure()
        return { status: response.status, result: null }
      }
      const body = await readBoundedJson(response.body, GITHUB_API_BODY_BYTES)
      return { status: response.status, result: parseResult(body) }
    })
  } catch {
    throw githubFailure()
  }
}
