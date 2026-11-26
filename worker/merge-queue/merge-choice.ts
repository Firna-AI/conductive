import type { MergeQueueWait } from '../../src/shared/generated/MergeQueueWait'
import { readQueueCapabilities } from '../github/merge-capabilities'
import { readMergeWorkspace } from '../github/merge-access'
import { repositoryMemberGitHub } from '../github/member-github'
import { HttpError } from '../http'
import type { QueueEntry, QueueMergeTarget, QueueRecord } from './contracts'
import type { QueuePullRead } from './merge-read'
import type { QueueRuntime } from './step'

export type QueueMergeAccess = Awaited<ReturnType<typeof queueMergeAccess>>

export async function queueMergeAccess(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entry: QueueMergeTarget,
  userId: string,
) {
  const { env, dependencies } = runtime
  const workspace = await readMergeWorkspace(
    env.DB,
    queue.orgId,
    entry.workspaceId,
    userId,
  )
  if (
    workspace.repositoryId !== queue.githubRepositoryId ||
    workspace.installationId !== queue.installationId ||
    workspace.branch !== entry.branch
  )
    return { kind: 'lost' } as const
  try {
    const member = await repositoryMemberGitHub(
      env,
      dependencies,
      workspace,
      userId,
    )
    const capabilities = await member.checked(() =>
      readQueueCapabilities(member.fetch, member.token, workspace),
    )
    return capabilities?.canWrite
      ? ({ kind: 'write', member, capabilities } as const)
      : ({ kind: 'lost' } as const)
  } catch (error) {
    if (
      error instanceof HttpError &&
      ['github_reconnect_required', 'github_refresh_failed'].includes(
        error.code,
      )
    )
      return { kind: 'token', error } as const
    throw error
  }
}

export interface MergeProjection {
  workspaceId: string
  head: string | null
  wait: MergeQueueWait | null
  blockedBy: number | null
}

export function layerWait(read: QueuePullRead): MergeQueueWait | null {
  const { entry, snapshot, stackNumber, standalone, local } = read
  if (entry.state === 'restacking') return 'rebase'
  if (read.restackWait) return read.restackWait
  if (
    entry.wait === 'active-turn' ||
    entry.wait === 'agent-login' ||
    entry.wait === 'open-session'
  )
    return entry.wait
  switch (snapshot?.banner.state) {
    case 'ready-to-merge':
      if (stackNumber === null && !standalone) return 'rebase'
      if (local === 'clean') return null
      return local === 'dirty' ? 'push' : 'local-work'
    case 'checks-running':
    case 'checks-failed':
      return 'checks'
    case 'changes-requested':
      return 'review'
    case 'conflict':
      return 'rebase'
    default:
      return 'rules'
  }
}

/** The manual prefix uses the clicker's access. Automatic failures still have a bar action. */
export function mergeChoices(
  reads: readonly QueuePullRead[],
  access: ReadonlyMap<string, QueueMergeAccess>,
) {
  let blocking: number | null = null
  let manual = true
  const automatic: QueuePullRead[] = []
  const projection = reads.map((read, index): MergeProjection => {
    const { entry, snapshot, stackNumber } = read
    const head = snapshot?.headSha ?? null
    const own = layerWait(read)
    manual = manual && own === null && stackNumber !== null
    const actor = access.get(entry.queuerUserId)
    const refused = entry.refusedHead != null && entry.refusedHead === head
    const stopped =
      actor?.kind === 'token'
        ? 'token'
        : refused ||
            (actor?.kind === 'write' && !actor.capabilities.mergeMethod)
          ? 'merge-refused'
          : null
    const wait = own ?? stopped ?? (blocking === null ? null : 'lower-layer')
    const blockedBy =
      wait === 'lower-layer'
        ? (blocking ?? reads[index - 1]?.entry.pullNumber ?? null)
        : null
    if (wait === null) automatic.push(read)
    else blocking ??= blockedBy ?? entry.pullNumber
    return {
      workspaceId: entry.workspaceId,
      head: manual ? head : null,
      wait,
      blockedBy,
    }
  })
  return { automatic, projection }
}

export function queueLeaveFor(entry: QueueEntry) {
  return {
    workspaceId: entry.workspaceId,
    branch: entry.branch,
    pullNumber: entry.pullNumber,
  }
}
