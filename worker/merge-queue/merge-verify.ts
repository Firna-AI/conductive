import type { repositoryMemberGitHub } from '../github/member-github'
import { readQueuePull } from '../github/queue-pulls'
import type { QueueEntry, QueueRecord } from './contracts'
import { liveMergePrefix } from './merge-data'
import { queueWorkspace } from './repository'
import { layerAncestry } from './restack-ancestry'
import { hasOpenStack, matchesStack, readQueueStack } from './stack-read'
import type { QueueRuntime } from './step'

export interface CheckedLayer {
  entry: QueueEntry
  headSha: string
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
  const live = await readQueuePull(
    fetch,
    token,
    binding,
    bottom.entry.branch,
    queue.trunk,
  )
  if (live.defaultBranch !== queue.trunk || live.fullName !== queue.fullName)
    return false
  if (queue.githubStackNumber === null) {
    if (
      layers.length !== 1 ||
      (await hasOpenStack(fetch, token, queue, bottom.entry.pullNumber))
    )
      return false
    if (
      live.kind !== 'open' ||
      live.pull.number !== bottom.entry.pullNumber ||
      live.pull.draft ||
      live.pull.base !== queue.trunk ||
      live.pull.headSha !== bottom.headSha
    )
      return false
  } else {
    const stack = await readQueueStack(queue, fetch, token)
    if (!stack?.open || stack.baseBranch !== queue.trunk) return false
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
