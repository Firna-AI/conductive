import type { AppDependencies, AppEnv } from '../env'
import { authorizeMerge, readMergeWorkspace } from '../github/merge-access'
import { repositoryMemberGitHub } from '../github/member-github'
import { readQueuePull } from '../github/queue-pulls'
import type {
  QueueEntry,
  QueueLeave,
  QueueRecord,
  QueueScope,
  QueueWriter,
} from './contracts'
import { readQueue, readQueueEntries } from './data'
import { queueChanged } from './errors'
import { resetLeavingBases } from './leave-base'
import { leaveOrder } from './order'
import { queueReadToken, queueWorkspace } from './repository'
import { followWorkspaceBase } from './restack-data'
import { renameQueueTrunk, staleQueueEntries } from './step-data'
import { completeQueueStep, saveQueueOrder } from './writes'

export interface QueueRuntime {
  env: AppEnv
  dependencies: AppDependencies
  restackAfterLeave?(queue: QueueRecord): Promise<void>
}

export async function leaveQueue(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entries: QueueEntry[],
  signal: QueueLeave,
  writer?: QueueWriter,
): Promise<QueueEntry[]> {
  const { remaining, removed } = leaveOrder(entries, signal)
  if (!removed.length) return entries
  if (writer)
    await authorizeMerge(runtime.env.DB, writer.workspace, writer.memberId)
  const notices = await resetLeavingBases(runtime, queue, entries, removed, {
    ...signal,
    actorId: writer?.memberId ?? signal.actorId,
  })
  if (signal.cause !== 'merged') {
    for (const entry of removed) {
      const base =
        signal.cause === 'base-changed' &&
        entry.workspaceId === signal.workspaceId
          ? signal.baseBranch
          : (notices.find(
              ({ workspaceId }) => workspaceId === entry.workspaceId,
            )?.baseBranch ??
            (entry.githubBase === queue.trunk
              ? queue.trunk
              : entry.memberBase) ??
            queue.trunk)
      if (base) await followWorkspaceBase(runtime, queue, entry, base)
    }
  }
  const saved = await saveQueueOrder(runtime.env.DB, {
    id: queue.id,
    remaining,
    removed,
    now: runtime.dependencies.now(),
    writeId: runtime.dependencies.randomToken(),
    writer,
    notices,
    ...(signal.cause === 'merged' && { merged: removed[0] }),
  })
  if (!saved && writer) {
    await authorizeMerge(runtime.env.DB, writer.workspace, writer.memberId)
    throw queueChanged()
  }
  if (saved) await runtime.restackAfterLeave?.(queue)
  return remaining
}

async function checkTrunk(
  runtime: QueueRuntime,
  queue: QueueRecord,
  entries: QueueEntry[],
) {
  const bottom = entries[0]
  if (!bottom || queue.trunk === queue.defaultBranch) return
  const { env, dependencies } = runtime
  const live = await readTrunk(runtime, queue, bottom)
  if (live.defaultBranch !== queue.defaultBranch) return
  if (live.refExists) {
    await leaveQueue(runtime, queue, entries, {
      cause: 'default-branch-switched',
    })
    return
  }
  if (
    live.kind === 'open' &&
    live.pull.number === bottom.pullNumber &&
    live.pull.base === live.defaultBranch
  )
    await renameQueueTrunk(env.DB, queue, dependencies.now())
}

async function readTrunk(
  runtime: QueueRuntime,
  queue: QueueRecord,
  bottom: QueueEntry,
) {
  const { env, dependencies } = runtime
  const binding = queueWorkspace(queue, bottom)
  const read = (fetch: AppDependencies['fetch'], token: string) =>
    readQueuePull(fetch, token, binding, bottom.branch, queue.trunk)
  if (env.GITHUB_APP_PRIVATE_KEY)
    return read(dependencies.fetch, await queueReadToken(runtime, binding))
  const workspace = await readMergeWorkspace(
    env.DB,
    queue.orgId,
    bottom.workspaceId,
    bottom.queuerUserId,
  )
  const member = await repositoryMemberGitHub(
    env,
    dependencies,
    workspace,
    bottom.queuerUserId,
  )
  return member.checked(() => read(member.fetch, member.token))
}

type QueueStep =
  | { kind: 'leave'; signals: QueueLeave[] }
  | { kind: 'trunk-change' }
  | { kind: 'finish' }
  | { kind: 'idle' }

async function nextStep(
  db: D1Database,
  queue: QueueRecord,
  entries: QueueEntry[],
): Promise<QueueStep> {
  if (entries.length) {
    if (queue.suspendedAt !== null)
      return { kind: 'leave', signals: [{ cause: 'org-suspended' }] }
    const signals = await staleQueueEntries(db, queue)
    if (signals.length) return { kind: 'leave', signals }
    if (queue.trunk !== queue.defaultBranch) return { kind: 'trunk-change' }
  }
  return { kind: queue.pendingWrite ? 'finish' : 'idle' }
}

/** Advance the saved queue once. Later steps run here with the same coordinator lock. */
export async function stepQueue(
  runtime: QueueRuntime,
  scope: QueueScope,
): Promise<void> {
  const { env, dependencies } = runtime
  const queue = await readQueue(env.DB, scope)
  if (!queue) return
  let entries = await readQueueEntries(env.DB, queue.id)
  const step = await nextStep(env.DB, queue, entries)
  switch (step.kind) {
    case 'idle':
      return
    case 'leave':
      for (const signal of step.signals)
        entries = await leaveQueue(runtime, queue, entries, signal)
      await checkTrunk(runtime, queue, entries)
      break
    case 'trunk-change':
      await checkTrunk(runtime, queue, entries)
      break
    case 'finish':
      break
  }
  await completeQueueStep(env.DB, queue.id, dependencies.now())
}
