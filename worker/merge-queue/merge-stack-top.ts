import type { RequestQueueStackMerge } from '../../src/shared/generated/RequestQueueStackMerge'
import type { GitHubWorkspace } from '../github/contracts'
import type { GitHubStack } from '../github/stack-parsers'
import type { QueueEntry, QueueRecord } from './contracts'
import { queueMergeNotReady, queueWriteRequired } from './errors'
import { queueMergeAccess } from './merge-choice'
import type { QueueMergeJob } from './merge-job'
import { queueReader, queueWorkspace } from './repository'
import { openStackLayers, readStackPrefix } from './stack-read'
import type { QueueRuntime } from './step'

/** Select the queued prefix of the stack that the click names. */
export async function readStackMerge(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entries: readonly QueueEntry[],
  workspace: GitHubWorkspace,
  userId: string,
  input: RequestQueueStackMerge,
) {
  const { pullNumber, headSha, stackCount } = input
  const target = {
    workspaceId: workspace.id,
    branch: workspace.branch,
    pullNumber,
  }
  const actor = await queueMergeAccess(runtime, queue, target, userId)
  if (actor.kind === 'lost') throw queueWriteRequired()
  if (actor.kind === 'token') throw actor.error
  const method = actor.capabilities.mergeMethod
  if (!method) throw queueMergeNotReady()
  const { fetch, token } = actor.member
  const stack = await readStackPrefix(fetch, token, queue.fullName, pullNumber)
  const top = stack?.layers.at(-1)
  if (
    stack?.layers.length !== stackCount ||
    top?.headBranch !== workspace.branch ||
    top.headSha !== headSha
  )
    throw queueMergeNotReady()
  const stackPullNumbers = stack.layers.map(({ number }) => number)
  const landed = new Set(stackPullNumbers)
  const queued = entries.filter(({ pullNumber }) => landed.has(pullNumber))
  if (
    !queued.length ||
    queued.length === stackCount ||
    queued.some(
      (entry, index) =>
        entry !== entries[index] ||
        entry.pullNumber !== stackPullNumbers[index],
    )
  )
    throw queueMergeNotReady()
  return {
    target,
    headSha,
    method,
    stackPullNumbers,
    queuedCount: queued.length,
    stackNumber: stack.number,
  }
}

/** Verify that the unqueued part still lands with the saved queued prefix. */
export async function verifyStackTop(
  runtime: QueueRuntime,
  job: QueueMergeJob,
  stack: GitHubStack,
  member: { token: string; fetch: QueueRuntime['dependencies']['fetch'] },
) {
  const { queue, target, layers, stackPullNumbers } = job
  if (!stackPullNumbers) return true
  const open = openStackLayers(stack)
  const end = open.findIndex(({ number }) => number === target.pullNumber) + 1
  if (end !== stackPullNumbers.length || layers.length >= end) return false
  const suffix = open.slice(layers.length, end)
  if (
    !suffix.every((pull, offset) => {
      const index = layers.length + offset
      return (
        pull.number === stackPullNumbers[index] &&
        !pull.draft &&
        pull.headRepositoryId === queue.githubRepositoryId &&
        pull.baseRepositoryId === queue.githubRepositoryId &&
        pull.baseBranch === open[index - 1].headBranch
      )
    })
  )
    return false
  const top = suffix.at(-1)
  if (top?.headBranch !== target.branch || top.headSha !== job.input.headSha)
    return false
  const reader = queueReader(
    {
      ...runtime,
      dependencies: { ...runtime.dependencies, fetch: member.fetch },
    },
    queueWorkspace(queue, target),
    member.token,
  )
  const { snapshot } = await reader.queuedPull(target.pullNumber)
  return (
    snapshot?.banner.state === 'ready-to-merge' &&
    snapshot.headSha === top.headSha &&
    snapshot.pullBaseBranch === top.baseBranch
  )
}
