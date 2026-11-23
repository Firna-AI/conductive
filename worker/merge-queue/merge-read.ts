import { workspaceBinding } from '../app-api/workspace-state'
import type { HttpFetch } from '../env'
import type { GitHubSnapshot } from '../github/contracts'
import type { repositoryMemberGitHub } from '../github/member-github'
import { readQueuePull } from '../github/queue-pulls'
import {
  getPullRequestStack,
  listPullRequestStacks,
} from '../github/stack-client'
import type { GitHubStackPullRequest } from '../github/stack-parsers'
import { HttpError } from '../http'
import type { QueueEntry, QueueRecord } from './contracts'
import { liveMergePrefix } from './merge-data'
import { rememberQueueBase } from './old-base'
import { queueReader, queueReadToken, queueWorkspace } from './repository'
import type { QueueRuntime } from './step'

export interface QueuePullSnapshot {
  entry: QueueEntry
  snapshot: GitHubSnapshot | null
}

export interface QueuePullRead extends QueuePullSnapshot {
  /** Contiguous, checked membership in the saved GitHub stack. */
  stacked: boolean
  standalone: boolean
  clean: boolean
}

export interface CheckedLayer {
  entry: QueueEntry
  headSha: string
}

async function savedStack(queue: QueueRecord, fetch: HttpFetch, token: string) {
  if (queue.githubStackNumber === null) return null
  try {
    const stack = await getPullRequestStack(
      fetch,
      token,
      queue.fullName,
      queue.githubStackNumber,
    )
    return stack.number === queue.githubStackNumber &&
      stack.baseBranch === queue.trunk
      ? stack
      : null
  } catch (error) {
    if (error instanceof HttpError && error.code === 'github_not_found')
      return null
    throw error
  }
}

function matchesStack(
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
    layer.headSha === headSha &&
    layer.headRepositoryId === queue.githubRepositoryId &&
    layer.baseRepositoryId === queue.githubRepositoryId,
  )
}

async function hasOpenStack(
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

/** Check the default branch, open stack, and the saved prefix before sending a merge. */
export async function verifyMergePrefix(
  runtime: QueueRuntime,
  queue: QueueRecord,
  layers: readonly CheckedLayer[],
  member: Awaited<ReturnType<typeof repositoryMemberGitHub>>,
) {
  const bottom = layers[0]
  if (!bottom) return false
  const { fetch, token } = member
  const binding = queueWorkspace(queue, bottom.entry)
  const live = await readQueuePull(fetch, token, binding, bottom.entry.branch)
  if (live.defaultBranch !== queue.trunk || live.fullName !== queue.fullName)
    return false
  if (queue.githubStackNumber === null) {
    if (
      layers.length !== 1 ||
      (await hasOpenStack(fetch, token, queue, bottom.entry.pullNumber))
    )
      return false
    const pull = await queueReader(runtime, binding, token).pullDetails(
      bottom.entry.pullNumber,
    )
    if (
      pull.state !== 'OPEN' ||
      pull.draft ||
      pull.baseBranch !== queue.trunk ||
      pull.headSha !== bottom.headSha
    )
      return false
  } else {
    const stack = await savedStack(queue, fetch, token)
    if (!stack?.open) return false
    const open = stack.layers.filter((layer) => layer.state === 'open')
    if (
      !layers.every(({ entry, headSha }, index) =>
        matchesStack(
          queue,
          open[index],
          entry,
          headSha,
          layers[index - 1]?.entry.branch ?? queue.trunk,
        ),
      )
    )
      return false
  }
  return liveMergePrefix(
    runtime.env.DB,
    queue,
    layers.map(({ entry }) => entry),
  )
}

async function cleanWorkspace(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entry: QueueEntry,
  userId: string,
) {
  try {
    return await workspaceBinding(runtime.env)
      .getByName(entry.workspaceId)
      .mergeQueueLocalClean({
        orgId: queue.orgId,
        workspaceId: entry.workspaceId,
        repositoryId: queue.repositoryId,
        branch: entry.branch,
        userId,
      })
  } catch (error) {
    if (error instanceof HttpError || error instanceof Error) return false
    throw error
  }
}

export async function readMergePulls(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entries: readonly QueueEntry[],
  clicker?: string,
): Promise<QueuePullRead[]> {
  const bottom = entries[0]
  if (!bottom) return []
  const token = await queueReadToken(runtime, queueWorkspace(queue, bottom))
  const fetch = runtime.dependencies.fetch
  const stack = await savedStack(queue, fetch, token)
  const open = stack?.layers.filter((layer) => layer.state === 'open') ?? []
  const standalone =
    entries.length === 1 &&
    queue.trunk === queue.defaultBranch &&
    queue.githubStackNumber === null &&
    !(await hasOpenStack(fetch, token, queue, bottom.pullNumber))
  const reads: QueuePullRead[] = []
  let prefix = !!stack && stack.open && queue.trunk === queue.defaultBranch
  let base = queue.trunk
  for (const { entry, snapshot } of await readMergeSnapshots(
    runtime,
    queue,
    entries,
    token,
  )) {
    await rememberQueueBase(runtime, queue, token, { entry, snapshot })
    prefix =
      prefix &&
      snapshot?.pullBaseBranch === base &&
      matchesStack(queue, open[reads.length], entry, snapshot.headSha, base)
    const single = standalone && snapshot?.pullBaseBranch === queue.trunk
    reads.push({
      entry,
      snapshot,
      stacked: prefix,
      standalone: single,
      clean:
        snapshot?.banner.state === 'ready-to-merge' &&
        (prefix || single) &&
        (await cleanWorkspace(
          runtime,
          queue,
          entry,
          clicker ?? entry.queuerUserId,
        )),
    })
    base = entry.branch
  }
  return reads
}

export async function readMergeSnapshots(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entries: readonly QueueEntry[],
  token?: string,
): Promise<QueuePullSnapshot[]> {
  if (!entries.length) return []
  const credential =
    token ?? (await queueReadToken(runtime, queueWorkspace(queue, entries[0])))
  const reads: QueuePullSnapshot[] = []
  for (const entry of entries) {
    const reader = queueReader(
      runtime,
      queueWorkspace(queue, entry),
      credential,
    )
    let snapshot: GitHubSnapshot | null
    try {
      snapshot = await reader.readPull(entry.pullNumber)
    } catch (error) {
      if (!(error instanceof HttpError) || error.code !== 'github_pending')
        throw error
      snapshot = null
    }
    reads.push({ entry, snapshot })
  }
  return reads
}
