import type { repositoryMemberGitHub } from '../github/member-github'
import { readQueuePull } from '../github/queue-pulls'
import type { GitHubStack } from '../github/stack-parsers'
import type { QueueEntry } from './contracts'
import { readQueueEntries } from './data'
import { liveMergePrefix } from './merge-data'
import type { QueueMergeJob } from './merge-job'
import { verifyStackTop } from './merge-stack-top'
import { queueWorkspace } from './repository'
import { layerAncestry } from './restack-ancestry'
import {
  matchesStack,
  openStackLayers,
  readOtherStack,
  readQueueStack,
} from './stack-read'
import type { QueueRuntime } from './step'

export interface CheckedLayer {
  entry: QueueEntry
  headSha: string
}

/** Check the default branch, open stack, and the saved prefix before sending a merge. */
export async function verifyMergePrefix(
  runtime: QueueRuntime,
  job: QueueMergeJob,
  member: Awaited<ReturnType<typeof repositoryMemberGitHub>>,
) {
  const { queue, layers, memberStackNumber } = job
  const bottom = layers[0]
  if (!bottom) return false
  const { fetch, token } = member
  const binding = queueWorkspace(queue, bottom.entry)
  const live = await readQueuePull(
    fetch,
    token,
    binding,
    bottom.entry.branch,
    queue.trunk,
  )
  if (live.defaultBranch !== queue.trunk || live.fullName !== queue.fullName)
    return false
  let stack: GitHubStack | null = null
  if (queue.githubStackNumber === null) {
    const db = runtime.env.DB
    const entries = await readQueueEntries(db, queue.id)
    const other = await readOtherStack(
      db,
      queue,
      entries,
      bottom.entry,
      fetch,
      token,
    )
    if (memberStackNumber === undefined) {
      if (layers.length !== 1 || other.kind !== 'none') return false
    } else {
      if (
        other.kind !== 'member' ||
        other.stack.number !== memberStackNumber ||
        layers.length > other.count
      )
        return false
      stack = other.stack
    }
  } else {
    stack = await readQueueStack(queue, fetch, token)
    if (!stack) return false
  }
  if (!stack) {
    if (
      live.kind !== 'open' ||
      live.pull.number !== bottom.entry.pullNumber ||
      live.pull.draft ||
      live.pull.base !== queue.trunk ||
      live.pull.headSha !== bottom.headSha
    )
      return false
  } else {
    if (!stack.open || stack.baseBranch !== queue.trunk) return false
    const open = openStackLayers(stack)
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
  if (
    job.stackPullNumbers &&
    (!stack || !(await verifyStackTop(runtime, job, stack, member)))
  )
    return false
  let baseHead = live.refHead
  for (const { entry, headSha } of layers) {
    if (
      !baseHead ||
      (await layerAncestry(
        fetch,
        token,
        queue.fullName,
        entry,
        baseHead,
        headSha,
      )) !== 'aligned'
    )
      return false
    baseHead = headSha
  }
  return liveMergePrefix(
    runtime.env.DB,
    queue,
    layers.map(({ entry }) => entry),
  )
}
