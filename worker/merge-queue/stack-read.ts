import type { HttpFetch } from '../env'
import {
  getPullRequestStack,
  listPullRequestStacks,
} from '../github/stack-client'
import { githubFailure } from '../github/parsers'
import type {
  GitHubStack,
  GitHubStackLayer,
  GitHubStackPullRequest,
} from '../github/stack-parsers'
import { HttpError } from '../http'
import type { QueueEntry, QueueRecord } from './contracts'
import { stackOfAnotherQueue } from './data'

type ListedStack = GitHubStack<GitHubStackLayer>

export function openStackLayers<T extends GitHubStackLayer>(
  stack: GitHubStack<T>,
) {
  return stack.layers.filter((layer) => layer.state === 'open')
}

async function openPullStacks(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  pullNumber: number,
) {
  return (
    await listPullRequestStacks(fetch, token, fullName, pullNumber)
  ).filter(
    (stack) =>
      stack.open &&
      stack.layers.some(
        (layer) => layer.state === 'open' && layer.number === pullNumber,
      ),
  )
}

/** The open layers up to the target, in the order GitHub lands them. */
export async function readStackPrefix(
  fetch: HttpFetch,
  token: string,
  fullName: string,
  pullNumber: number,
) {
  const [stack, other] = await openPullStacks(
    fetch,
    token,
    fullName,
    pullNumber,
  )
  if (other) throw githubFailure()
  if (!stack) return null
  const open = openStackLayers(stack)
  const end = open.findIndex((layer) => layer.number === pullNumber) + 1
  return { number: stack.number, layers: open.slice(0, end) }
}

function matchesEntry(entry: QueueEntry | undefined, layer: GitHubStackLayer) {
  return entry?.pullNumber === layer.number && entry.branch === layer.headBranch
}

export function isQueueStackPrefix(
  stack: ListedStack,
  queue: QueueRecord,
  entries: readonly QueueEntry[],
) {
  return (
    stack.baseBranch === queue.trunk &&
    openStackLayers(stack).every((layer, index) =>
      matchesEntry(entries[index], layer),
    )
  )
}

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

type OtherStack =
  | { kind: 'none' | 'blocked' }
  | { kind: 'queueable'; stack: ListedStack }
  | { kind: 'member'; stack: GitHubStack; count: number }

/** A member stack can merge its queued unit from the trunk without changing the stack. */
export async function readOtherStack(
  db: D1Database,
  queue: QueueRecord,
  entries: readonly QueueEntry[],
  entry: QueueEntry,
  fetch: HttpFetch,
  token: string,
): Promise<OtherStack> {
  const stacks = (
    await openPullStacks(fetch, token, queue.fullName, entry.pullNumber)
  ).filter((stack) => stack.number !== queue.githubStackNumber)
  const stack = stacks[0]
  if (!stack) return { kind: 'none' }
  if (stacks.length > 1 || (await stackOfAnotherQueue(db, queue, stack.number)))
    return { kind: 'blocked' }
  const unit = entries.filter(({ unitId }) => unitId === entry.unitId)
  const queued = new Set(entries.map(({ pullNumber }) => pullNumber))
  const isMemberPrefix = (value: ListedStack) => {
    const open = openStackLayers(value)
    return (
      value.open &&
      value.baseBranch === queue.trunk &&
      open.length > unit.length &&
      unit[0]?.pullNumber === entry.pullNumber &&
      unit.every((layer, index) => matchesEntry(layer, open[index])) &&
      open.slice(unit.length).every(({ number }) => !queued.has(number))
    )
  }
  if (isMemberPrefix(stack)) {
    const live = await getPullRequestStack(
      fetch,
      token,
      queue.fullName,
      stack.number,
    )
    return live.number === stack.number && isMemberPrefix(live)
      ? { kind: 'member', stack: live, count: unit.length }
      : { kind: 'blocked' }
  }
  if (
    (queue.githubStackNumber === null &&
      isQueueStackPrefix(stack, queue, entries)) ||
    openStackLayers(stack).every(({ number }) =>
      unit.some(({ pullNumber }) => pullNumber === number),
    )
  )
    return { kind: 'queueable', stack }
  return { kind: 'blocked' }
}
