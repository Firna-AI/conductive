import type { GitHubMergeMethod } from '../../src/shared/github'
import type { QueueEntry, QueueRecord, QueueScope } from './contracts'
import { readQueue, readQueueEntries } from './data'
import { queueMergeNotReady, queueMerging, queueWriteRequired } from './errors'
import {
  layerWait,
  mergeChoices,
  queueLeaveFor,
  queueMergeAccess,
  type QueueMergeAccess,
} from './merge-choice'
import { clearMergeHeads, projectMerge } from './merge-data'
import {
  MERGE_RETRY_MS,
  prepareQueueMerge,
  QueueMergeJobs,
  type QueueMergeJob,
} from './merge-job'
import { readMergePulls, type QueuePullRead } from './merge-read'
import { reconcileMergePulls } from './merge-settle'
import { saveQueueAlarm } from './queue-alarm'
import { leaveQueue, type QueueRuntime } from './step'

const CHECK_WAIT = 'merge-queue:checks-wait'
const CHECK_WAIT_MS = 15 * 60_000

interface CheckWait {
  workspaceId: string
  queuedAt: number
  deadline: number
}

/** Each call runs in the named queue object's sequence. */
export class QueueMerges {
  private readonly runtime: QueueRuntime
  private readonly storage: DurableObjectStorage
  readonly jobs: QueueMergeJobs

  constructor(runtime: QueueRuntime, storage: DurableObjectStorage) {
    this.runtime = runtime
    this.storage = storage
    this.jobs = new QueueMergeJobs(runtime, storage)
  }

  async resume() {
    const resumed = await this.jobs.resume()
    if (resumed && !(await this.jobs.active()))
      await this.storage.delete(CHECK_WAIT)
    return resumed
  }

  private schedule(scope: QueueScope, at: number) {
    return this.storage.transaction((storage) =>
      saveQueueAlarm(storage, scope, at),
    )
  }

  private async read(
    queue: QueueRecord,
    entries: QueueEntry[],
    clicker?: string,
  ) {
    const { env, dependencies } = this.runtime
    const reads = await readMergePulls(this.runtime, queue, entries, clicker)
    const remaining = await reconcileMergePulls(
      this.runtime,
      queue,
      entries,
      reads,
    )
    if (remaining !== entries) {
      await this.schedule(queue, dependencies.now())
      return null
    }
    const access = new Map<string, QueueMergeAccess>()
    for (const entry of entries) {
      if (access.has(entry.queuerUserId)) continue
      const actor = await queueMergeAccess(
        this.runtime,
        queue,
        entry,
        entry.queuerUserId,
      )
      if (actor.kind === 'lost') {
        await leaveQueue(this.runtime, queue, entries, {
          ...queueLeaveFor(entry),
          cause: 'write-access-lost',
        })
        await this.schedule(queue, dependencies.now())
        return null
      }
      access.set(entry.queuerUserId, actor)
    }
    const choices = mergeChoices(reads, access)
    await projectMerge(env.DB, queue, choices.projection, dependencies.now())
    return { reads, access, ...choices }
  }

  async manual(
    queue: QueueRecord,
    entries: QueueEntry[],
    target: QueueEntry,
    userId: string,
    ahead: number,
  ) {
    if (await this.jobs.active()) throw queueMerging()
    if (
      target.place !== ahead + 1 ||
      queue.githubStackNumber === null ||
      queue.trunk !== queue.defaultBranch
    )
      throw queueMergeNotReady()
    const actor = await queueMergeAccess(this.runtime, queue, target, userId)
    if (actor.kind === 'lost') throw queueWriteRequired()
    if (actor.kind === 'token') throw actor.error
    if (!actor.capabilities.mergeMethod) throw queueMergeNotReady()
    const read = await this.read(queue, entries, userId)
    const prefix = read?.reads.slice(0, ahead + 1)
    if (
      !prefix ||
      prefix.length !== ahead + 1 ||
      prefix.some((layer) => !layer.stacked || layerWait(layer) !== null)
    )
      throw queueMergeNotReady()
    if (
      !(await this.start(queue, prefix, userId, actor.capabilities.mergeMethod))
    )
      throw queueMergeNotReady()
  }

  private async waitsForChecks(
    queue: QueueRecord,
    upper: QueuePullRead | undefined,
    now: number,
  ) {
    if (!upper?.stacked || upper.snapshot?.banner.state !== 'checks-running') {
      await this.storage.delete(CHECK_WAIT)
      return false
    }
    const { workspaceId, queuedAt } = upper.entry
    const previous = await this.storage.get<CheckWait>(CHECK_WAIT)
    const deadline =
      previous?.workspaceId === workspaceId && previous.queuedAt === queuedAt
        ? previous.deadline
        : now + CHECK_WAIT_MS
    if (deadline <= now) return false
    await this.storage.put<CheckWait>(CHECK_WAIT, {
      workspaceId,
      queuedAt,
      deadline,
    })
    await this.schedule(queue, deadline)
    return true
  }

  async automatic(scope: QueueScope) {
    const { env, dependencies } = this.runtime
    const queue = await readQueue(env.DB, scope)
    if (
      !queue ||
      queue.suspendedAt !== null ||
      queue.trunk !== queue.defaultBranch ||
      (!env.GITHUB_APP_PRIVATE_KEY && queue.githubStackNumber === null)
    )
      return
    const entries = await readQueueEntries(env.DB, queue.id)
    if (!entries.length) return
    const read = await this.read(queue, entries)
    if (!read) return
    const target = read.automatic.at(-1)
    if (!target) {
      await this.storage.delete(CHECK_WAIT)
      if (
        read.projection.some(({ wait }) => wait === 'token') ||
        read.reads.some(({ snapshot }) => snapshot === null)
      )
        await this.schedule(queue, dependencies.now() + MERGE_RETRY_MS)
      return
    }
    if (
      await this.waitsForChecks(
        queue,
        read.reads[read.automatic.length],
        dependencies.now(),
      )
    )
      return
    const actor = read.access.get(target.entry.queuerUserId)
    if (actor?.kind === 'write' && actor.capabilities.mergeMethod) {
      await this.start(
        queue,
        read.automatic,
        target.entry.queuerUserId,
        actor.capabilities.mergeMethod,
      )
    }
  }

  private async start(
    queue: QueueRecord,
    prefix: QueuePullRead[],
    userId: string,
    method: GitHubMergeMethod,
  ) {
    const layers = []
    for (const { entry, snapshot } of prefix) {
      if (!snapshot?.headSha) return false
      layers.push({ entry, headSha: snapshot.headSha })
    }
    const last = layers.at(-1)
    if (!last) return false
    const now = this.runtime.dependencies.now()
    const job: Extract<QueueMergeJob, { stage: 'starting' }> = {
      queue,
      target: last.entry,
      layers,
      userId,
      input: { method, headSha: last.headSha },
      stage: 'starting',
      nextAt: now,
    }
    const member = await prepareQueueMerge(this.runtime, job)
    if (!member) {
      await clearMergeHeads(this.runtime.env.DB, queue)
      await this.schedule(queue, now + MERGE_RETRY_MS)
      return false
    }
    await this.jobs.start(job, member)
    return true
  }
}
