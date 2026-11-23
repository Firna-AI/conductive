import type { HttpFetch } from '../env'
import {
  getPullRequestStack,
  listPullRequestStacks,
} from '../github/stack-client'
import type { GitHubStackPullRequest } from '../github/stack-parsers'
import { HttpError } from '../http'
import type { QueueEntry, QueueRecord } from './contracts'

export async function readQueueStack(
  queue: QueueRecord,
  fetch: HttpFetch,
  token: string,
) {
  if (queue.githubStackNumber === null) return null
  try {
    const stack = await getPullRequestStack(
      fetch,
      token,
      queue.fullName,
      queue.githubStackNumber,
    )
    return stack.number === queue.githubStackNumber ? stack : null
  } catch (error) {
    if (error instanceof HttpError && error.code === 'github_not_found')
      return null
    throw error
  }
}

export function matchesStack(
  queue: QueueRecord,
  layer: GitHubStackPullRequest | undefined,
  entry: QueueEntry,
  headSha: string | null | undefined,
  base: string,
) {
  return Boolean(
    layer &&
    !layer.draft &&
    layer.number === entry.pullNumber &&
    layer.headBranch === entry.branch &&
    layer.baseBranch === base &&
    followsQueueBase(entry, layer.baseBranch, base) &&
    layer.headSha === headSha &&
    layer.headRepositoryId === queue.githubRepositoryId &&
    layer.baseRepositoryId === queue.githubRepositoryId,
  )
}

export function followsQueueBase(
  entry: QueueEntry,
  live: string,
  intended: string,
): boolean {
  return (
    entry.githubBase == null ||
    live === entry.githubBase ||
    live === entry.pendingBase ||
    (entry.syncFrom != null && live === intended)
  )
}

export async function hasOpenStack(
  fetch: HttpFetch,
  token: string,
  queue: QueueRecord,
  pullNumber: number,
) {
  const stacks = await listPullRequestStacks(
    fetch,
    token,
    queue.fullName,
    pullNumber,
  )
  return stacks.some(
    (stack) =>
      stack.open &&
      stack.layers.some(
        (layer) => layer.number === pullNumber && layer.state === 'open',
      ),
  )
}
