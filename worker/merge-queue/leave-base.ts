import { HttpError } from '../http'
import { requireActiveOrg } from '../data/user-access'
import { readQueueWriteAccess } from '../github/merge-capabilities'
import { compareMergeBase } from '../github/compare-merge-base'
import { changePullRequestBase } from '../github/pull-client'
import { readQueuePull } from '../github/queue-pulls'
import { freshGitHubUserToken } from '../security/github-tokens'
import type { QueueEntry, QueueLeave, QueueRecord } from './contracts'
import { canResetBase, leaveOwner, type QueueLeaveNotice } from './leave-data'
import { removalPlan } from './order'
import { queueReader, queueReadToken, queueWorkspace } from './repository'
import { followsQueueBase } from './stack-read'
import type { QueueRuntime } from './step'

type LeaveBase = { baseBranch: string; resetFailed?: true }

async function resetBase(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entry: QueueEntry,
  signal: QueueLeave,
  intendedBase: string,
): Promise<LeaveBase | null> {
  const { env, dependencies } = runtime
  const binding = queueWorkspace(queue, entry)
  const owner = await leaveOwner(env.DB, queue, entry.workspaceId)
  const queuerCanAct =
    queue.suspendedAt === null &&
    signal.cause !== 'queuer-left' &&
    signal.cause !== 'write-access-lost'
  const candidates = new Set([
    ...(queuerCanAct ? [entry.queuerUserId] : []),
    signal.actorId,
    owner?.id,
  ])
  let baseBranch = entry.githubBase ?? undefined
  for (const user of candidates) {
    if (user === undefined || !(await canResetBase(env.DB, queue, entry, user)))
      continue
    try {
      if (signal.cause !== 'org-suspended')
        await requireActiveOrg(env.DB, queue.orgId)
      const token = await freshGitHubUserToken(env, user, dependencies)
      const pull = await queueReader(runtime, binding, token).pullDetails(
        entry.pullNumber,
      )
      if (pull.state !== 'OPEN' || pull.baseBranch === queue.trunk) return null
      baseBranch = pull.baseBranch
      if (!followsQueueBase(entry, baseBranch, intendedBase))
        return { baseBranch }
      if (!(await readQueueWriteAccess(dependencies.fetch, token, binding)))
        continue
      if (!(await canResetBase(env.DB, queue, entry, user))) continue
      if (signal.cause !== 'org-suspended')
        await requireActiveOrg(env.DB, queue.orgId)
      const live = await readQueuePull(
        dependencies.fetch,
        token,
        binding,
        entry.branch,
        queue.trunk,
      )
      if (
        live.kind !== 'open' ||
        live.pull.number !== entry.pullNumber ||
        live.pull.headSha !== pull.headSha ||
        !live.refHead ||
        live.fullName !== queue.fullName
      )
        break
      if (!followsQueueBase(entry, live.pull.base, intendedBase))
        return { baseBranch: live.pull.base }
      if (live.pull.base !== baseBranch) break
      const common = await compareMergeBase(
        dependencies.fetch,
        token,
        queue.fullName,
        live.refHead,
        live.pull.headSha,
      )
      if (!common || common === live.pull.headSha) break
      try {
        await changePullRequestBase(
          dependencies.fetch,
          token,
          queue.fullName,
          entry.pullNumber,
          queue.trunk,
        )
      } catch (error) {
        if (!(error instanceof HttpError)) throw error
        if (error.code === 'github_access_required') continue
        break
      }
      return null
    } catch (error) {
      if (!(error instanceof HttpError)) throw error
    }
  }
  try {
    const token = await queueReadToken(runtime, binding)
    const pull = await queueReader(runtime, binding, token).pullDetails(
      entry.pullNumber,
    )
    if (pull.state !== 'OPEN' || pull.baseBranch === queue.trunk) return null
    baseBranch = pull.baseBranch
    if (!followsQueueBase(entry, baseBranch, intendedBase))
      return { baseBranch }
  } catch (error) {
    if (!(error instanceof HttpError)) throw error
  }
  return baseBranch === undefined || baseBranch === queue.trunk
    ? null
    : { baseBranch, resetFailed: true }
}

export async function resetLeavingBases(
  runtime: QueueRuntime,
  queue: QueueRecord,
  order: readonly QueueEntry[],
  removed: readonly QueueEntry[],
  signal: QueueLeave,
) {
  const bases = new Map<string, string>()
  const notices: QueueLeaveNotice[] = []
  if (signal.cause === 'base-changed' || signal.cause === 'merged')
    return { bases, notices }
  for (const entry of removed) {
    const below = order[order.indexOf(entry) - 1]
    if (!removalPlan(order, entry, queue.trunk).reset) continue
    const base = await resetBase(
      runtime,
      queue,
      entry,
      signal,
      below?.branch ?? queue.trunk,
    )
    if (!base) continue
    bases.set(entry.workspaceId, base.baseBranch)
    if (base.resetFailed)
      notices.push({
        workspaceId: entry.workspaceId,
        branch: entry.branch,
        pullNumber: entry.pullNumber,
        baseBranch: base.baseBranch,
      })
  }
  return { bases, notices }
}
