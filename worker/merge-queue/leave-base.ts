import { HttpError } from '../http'
import { requireActiveOrg } from '../data/user-access'
import { readQueueWriteAccess } from '../github/merge-capabilities'
import { changePullRequestBase } from '../github/pull-client'
import { freshGitHubUserToken } from '../security/github-tokens'
import type { QueueEntry, QueueLeave, QueueRecord } from './contracts'
import { canResetBase, leaveOwner, type QueueLeaveNotice } from './leave-data'
import { queueReader, queueReadToken, queueWorkspace } from './repository'
import type { QueueRuntime } from './step'

async function resetBase(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entry: QueueEntry,
  signal: QueueLeave,
): Promise<QueueLeaveNotice | null> {
  const { env, dependencies } = runtime
  const binding = queueWorkspace(queue, entry)
  const owner = await leaveOwner(env.DB, queue, entry)
  const queuerCanAct =
    queue.suspendedAt === null &&
    signal.cause !== 'queuer-left' &&
    signal.cause !== 'write-access-lost'
  const candidates = new Set([
    ...(queuerCanAct ? [entry.queuerUserId] : []),
    signal.actorId,
    owner?.id,
  ])
  let baseBranch: string | undefined
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
      if (!(await readQueueWriteAccess(dependencies.fetch, token, binding)))
        continue
      if (!(await canResetBase(env.DB, queue, entry, user))) continue
      if (signal.cause !== 'org-suspended')
        await requireActiveOrg(env.DB, queue.orgId)
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
  } catch (error) {
    if (!(error instanceof HttpError)) throw error
  }
  return baseBranch === undefined
    ? null
    : {
        workspaceId: entry.workspaceId,
        branch: entry.branch,
        pullNumber: entry.pullNumber,
        baseBranch,
      }
}

export async function resetLeavingBases(
  runtime: QueueRuntime,
  queue: QueueRecord,
  order: readonly QueueEntry[],
  removed: readonly QueueEntry[],
  signal: QueueLeave,
): Promise<QueueLeaveNotice[]> {
  if (signal.cause === 'base-changed' || signal.cause === 'merged') return []
  const notices: QueueLeaveNotice[] = []
  for (const entry of removed) {
    const below = order[order.indexOf(entry) - 1]
    if (entry.memberBase || below?.unitId === entry.unitId) continue
    const notice = await resetBase(runtime, queue, entry, signal)
    if (notice) notices.push(notice)
  }
  return notices
}
