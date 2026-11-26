import type { MergeQueueWait } from '../../src/shared/generated/MergeQueueWait'
import { readQueuePull } from '../github/queue-pulls'
import type { GitHubStack } from '../github/stack-parsers'
import { HttpError } from '../http'
import type { QueueEntry, QueueRecord, QueueScope } from './contracts'
import { readQueue, readQueueEntries, readQueueEntry } from './data'
import type { QueueFixTurns } from './fix-turns'
import { queueLeaveFor } from './merge-choice'
import { readMergeSnapshots, type QueuePullSnapshot } from './merge-read'
import { reconcileMergePulls } from './merge-settle'
import { saveQueueAlarm, saveQueueRetry } from './queue-alarm'
import { queueReadToken, queueWorkspace } from './repository'
import { finishQueueReorder, followWorkspaceBase } from './restack-data'
import { QueueLayerRestack, type LayerBase } from './restack-layer'
import { QueueStackChanges } from './stack-changes'
import { followsQueueBase, openStackLayers, readOtherStack } from './stack-read'
import { leaveQueue, type QueueRuntime } from './step'

export interface QueueRestackRead {
  queue: QueueRecord
  entries: QueueEntry[]
  token: string
  reads: QueuePullSnapshot[]
  stack: GitHubStack | null
  readyCount: number
  wait?: MergeQueueWait
}

const RESTACK_RETRY_MS = 30_000

/** The coordinator runs this before it selects a merge. */
export class QueueRestacks {
  private readonly runtime: QueueRuntime
  private readonly storage: DurableObjectStorage
  private readonly fixes: QueueFixTurns
  private readonly stacks: QueueStackChanges
  private readonly layer: QueueLayerRestack

  constructor(
    runtime: QueueRuntime,
    storage: DurableObjectStorage,
    fixes: QueueFixTurns,
  ) {
    this.runtime = runtime
    this.storage = storage
    this.fixes = fixes
    this.stacks = new QueueStackChanges(runtime, storage)
    this.layer = new QueueLayerRestack(runtime, fixes, this.stacks)
  }

  private schedule(scope: QueueScope, delay = 0) {
    return this.storage.transaction((storage) =>
      saveQueueAlarm(storage, scope, this.runtime.dependencies.now() + delay),
    )
  }

  async advance(scope: QueueScope): Promise<QueueRestackRead | null> {
    const { env, dependencies } = this.runtime
    const queue = await readQueue(env.DB, scope)
    if (!queue) return null
    const entries = await readQueueEntries(env.DB, queue.id)
    const bottom = entries[0]
    const active = await this.fixes.active()
    if (
      active &&
      !entries.some(
        ({ workspaceId, queuedAt }) =>
          workspaceId === active.entry.workspaceId &&
          queuedAt === active.entry.queuedAt,
      )
    )
      await this.fixes.advance(scope)
    const binding = bottom
      ? queueWorkspace(queue, bottom)
      : {
          id: queue.id,
          orgId: queue.orgId,
          branch: queue.trunk,
          repositoryId: queue.githubRepositoryId,
          installationId: queue.installationId,
          fullName: queue.fullName,
          defaultBranch: queue.trunk,
        }
    if (!bottom && queue.githubStackNumber === null) {
      if (!(await this.stacks.hasPendingCreation())) {
        if (queue.reordering) await finishQueueReorder(env.DB, queue)
        return null
      }
    }
    let token: string
    let stack: GitHubStack | null
    try {
      token = await queueReadToken(this.runtime, binding)
      if (await this.stacks.recoverCreation(queue, token)) {
        await this.schedule(scope)
        return null
      }
      stack = await this.stacks.current(queue, token)
    } catch (error) {
      if (
        bottom ||
        queue.githubStackNumber === null ||
        !(error instanceof HttpError)
      )
        throw error
      await this.retryCleanup(queue, true)
      return null
    }
    const reads = await readMergeSnapshots(this.runtime, queue, entries, token)
    if (
      (await reconcileMergePulls(this.runtime, queue, entries, reads)) !==
      entries
    ) {
      await this.schedule(scope)
      return null
    }
    const trunk =
      bottom && queue.suspendedAt === null
        ? await readQueuePull(
            dependencies.fetch,
            token,
            binding,
            bottom.branch,
            queue.trunk,
          )
        : null
    if (trunk) {
      if (
        trunk.defaultBranch !== queue.trunk ||
        queue.trunk !== queue.defaultBranch ||
        trunk.fullName !== queue.fullName ||
        !trunk.refHead
      ) {
        await this.schedule(scope, RESTACK_RETRY_MS)
        return null
      }
      if (await this.checkBases(queue, entries, reads)) return null
    }
    const clean = await this.stacks
      .cleanup(queue, entries, stack)
      .catch((error: unknown) => {
        if (error instanceof HttpError) return 'blocked' as const
        throw error
      })
    await this.retryCleanup(queue, clean === 'blocked')
    if (clean !== 'ready') {
      if (clean === 'changed') await this.schedule(scope)
      return clean === 'changed' || !bottom
        ? null
        : { queue, entries, token, reads, stack, readyCount: 0, wait: 'rules' }
    }
    if (!trunk?.refHead) return null

    let base: LayerBase = {
      branch: queue.trunk,
      head: trunk.refHead,
      pullNumber: null,
    }
    let end = reads.length
    for (const [index, read] of reads.entries()) {
      if (index === end) break
      try {
        const onStack =
          stack &&
          openStackLayers(stack)[index]?.number === read.entry.pullNumber
        const other = onStack
          ? ({ kind: 'none' } as const)
          : await readOtherStack(
              env.DB,
              queue,
              entries,
              read.entry,
              dependencies.fetch,
              token,
            )
        if (other.kind === 'blocked')
          return {
            queue,
            entries,
            token,
            reads,
            stack,
            readyCount: index,
            wait: 'rules',
          }
        if (other.kind === 'member') {
          if (index > 0) {
            end = index
            break
          }
          stack = other.stack
          end = other.count
        }
        await followWorkspaceBase(this.runtime, queue, read.entry, base.branch)
        const step = await this.layer.move(
          queue,
          entries,
          stack,
          index,
          read,
          base,
          token,
          other.kind === 'queueable',
        )
        if (step === 'ready') {
          base = {
            branch: read.entry.branch,
            head: read.pull.headSha,
            pullNumber: read.entry.pullNumber,
          }
          continue
        }
        if (step === 'changed') {
          await this.schedule(scope)
          return null
        }
        if (step !== 'fix' && step.retry)
          await this.schedule(scope, RESTACK_RETRY_MS)
        const current = await readQueueEntry(
          env.DB,
          queue.id,
          read.entry.workspaceId,
        )
        if (!current) return null
        reads[index] = { ...read, entry: current }
        return {
          queue,
          entries,
          token,
          reads,
          stack,
          readyCount: index,
          wait: step === 'fix' ? (current.wait ?? 'rebase') : step.wait,
        }
      } catch (error) {
        if (!(error instanceof HttpError)) throw error
        await this.schedule(scope, RESTACK_RETRY_MS)
        const wait =
          error.code === 'github_access_required' ? 'token' : 'rebase'
        return { queue, entries, token, reads, stack, readyCount: index, wait }
      }
    }
    if (queue.reordering) {
      await finishQueueReorder(env.DB, queue)
      queue.reordering = 0
    }
    return {
      queue,
      entries,
      token,
      reads,
      stack,
      readyCount: end,
      ...(end < reads.length && { wait: 'lower-layer' as const }),
    }
  }

  private retryCleanup(queue: QueueRecord, blocked: boolean) {
    return saveQueueRetry(
      this.storage,
      queue,
      'stack-cleanup',
      this.runtime.dependencies.now(),
      blocked ? String(queue.githubStackNumber) : undefined,
    )
  }

  private async checkBases(
    queue: QueueRecord,
    entries: QueueEntry[],
    reads: QueuePullSnapshot[],
  ) {
    let base = queue.trunk
    for (const { entry, pull } of reads) {
      const live = pull.baseBranch
      if (!followsQueueBase(entry, live, base)) {
        await leaveQueue(this.runtime, queue, entries, {
          ...queueLeaveFor(entry),
          cause: 'base-changed',
          baseBranch: live,
        })
        await this.schedule(queue)
        return true
      }
      base = entry.branch
    }
    return false
  }
}
