import { HttpError } from '../http'
import { warnWorker } from '../warnings'
import { readMergeWorkspace } from '../github/merge-access'
import { repositoryMemberGitHub } from '../github/member-github'
import { addUnit } from './admission'
import {
  queueId,
  type QueueLeave,
  type QueueMemberAction,
  type QueueScope,
} from './contracts'
import { readQueue, readQueueEntries } from './data'
import { queueChanged, queueMissing, queueWriteRequired } from './errors'
import type { QueueFixEnd, QueueRestack } from './fix-contracts'
import { QueueFixTurns } from './fix-turns'
import { MERGE_RETRY_MS } from './merge-job'
import { QueueMerges } from './merges'
import { moveUnit } from './order'
import { QUEUE_SCOPE_KEY, saveQueueAlarm } from './queue-alarm'
import { leaveQueue, stepQueue, type QueueRuntime } from './step'
import { QueueRestacks } from './restacks'
import { saveQueueOrder } from './writes'

const DEFERRED_LEAVES = 'merge-queue:deferred-leaves'

export class QueueCoordinator {
  private readonly runtime: QueueRuntime
  private readonly context: DurableObjectState
  private readonly fixes: QueueFixTurns
  private readonly merges: QueueMerges
  private readonly restacks: QueueRestacks
  private pending: Promise<void> = Promise.resolve()

  constructor(runtime: QueueRuntime, context: DurableObjectState) {
    this.context = context
    this.runtime = {
      ...runtime,
      restackAfterLeave: (queue) => this.schedule(queue),
    }
    this.fixes = new QueueFixTurns(this.runtime, context.storage)
    this.merges = new QueueMerges(this.runtime, context.storage)
    this.restacks = new QueueRestacks(this.runtime, context.storage, this.fixes)
  }

  private run<T>(work: () => Promise<T>): Promise<T> {
    const next = this.pending.then(work)
    this.pending = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  private checkName(scope: QueueScope) {
    const expected = this.runtime.env.WORKSPACES?.idFromName(queueId(scope))
    if (!expected?.equals(this.context.id))
      throw new HttpError(404, 'not_found', 'The page is not available.')
  }

  private schedule(scope: QueueScope): Promise<void> {
    return this.context.storage.transaction((storage) =>
      saveQueueAlarm(storage, scope, this.runtime.dependencies.now()),
    )
  }

  private async applyLeave(scope: QueueScope, signal: QueueLeave) {
    const db = this.runtime.env.DB
    const queue = await readQueue(db, scope)
    if (queue)
      await leaveQueue(
        this.runtime,
        queue,
        await readQueueEntries(db, queue.id),
        signal,
      )
  }

  private async drainLeaves(scope: QueueScope) {
    const storage = this.context.storage
    const leaves = await storage.get<QueueLeave[]>(DEFERRED_LEAVES)
    if (!leaves) return
    for (const signal of leaves) await this.applyLeave(scope, signal)
    await storage.delete(DEFERRED_LEAVES)
  }

  change(
    scope: QueueScope,
    workspaceId: string,
    userId: string,
    action: QueueMemberAction,
  ): Promise<void> {
    return this.run(async () => {
      this.checkName(scope)
      if (!(await this.merges.jobs.active())) await this.drainLeaves(scope)
      const { env, dependencies } = this.runtime
      const workspace = await readMergeWorkspace(
        env.DB,
        scope.orgId,
        workspaceId,
        userId,
      )
      if (workspace.repositoryId !== scope.githubRepositoryId)
        throw queueMissing()
      const queue = await readQueue(env.DB, scope)
      const entries = queue ? await readQueueEntries(env.DB, queue.id) : []
      const entry = entries.find(
        (item) =>
          item.workspaceId === workspaceId && item.branch === workspace.branch,
      )
      if (action.kind === 'merge') {
        if (!queue || !entry) throw queueMissing()
        return this.merges.manual(queue, entries, entry, userId, action.ahead)
      }
      if (action.kind === 'merge-stack') {
        if (!queue || entry) throw queueMissing()
        return this.merges.manualStack(
          queue,
          entries,
          workspace,
          userId,
          action,
        )
      }
      const member = await repositoryMemberGitHub(
        env,
        dependencies,
        workspace,
        userId,
      )
      if (!(await member.capabilities()).canWrite) throw queueWriteRequired()
      if (action.kind === 'add') {
        await this.schedule(scope)
        return addUnit({
          env,
          dependencies,
          scope,
          workspace,
          memberId: userId,
          member,
          entries,
          githubStackNumber: queue?.githubStackNumber ?? null,
          storedTrunk: queue?.trunk ?? null,
        })
      }
      if (!queue || !entry) throw queueMissing()
      await member.authorize()
      await this.schedule(scope)
      const writer = { workspace, memberId: userId }
      if (action.kind === 'remove') {
        await leaveQueue(
          this.runtime,
          queue,
          entries,
          {
            cause: 'removed',
            workspaceId,
            branch: workspace.branch,
          },
          writer,
        )
        return
      }
      const ordered = moveUnit(entries, entry, action.beforeWorkspaceId)
      if (ordered !== entries) {
        const saved = await saveQueueOrder(env.DB, {
          id: queue.id,
          remaining: ordered,
          removed: [],
          now: dependencies.now(),
          writeId: dependencies.randomToken(),
          writer,
          reordering: true,
        })
        if (!saved) {
          await member.authorize()
          throw queueChanged()
        }
      }
    })
  }

  wake(scope: QueueScope, signal?: QueueLeave): Promise<void> {
    return this.run(async () => {
      this.checkName(scope)
      const job = signal && (await this.merges.jobs.active())
      if (job && signal) {
        await this.context.storage.transaction(async (storage) => {
          const leaves =
            (await storage.get<QueueLeave[]>(DEFERRED_LEAVES)) ?? []
          if (
            !leaves.some(
              (leave) => JSON.stringify(leave) === JSON.stringify(signal),
            )
          )
            await storage.put(DEFERRED_LEAVES, [...leaves, signal])
          await saveQueueAlarm(storage, scope, job.nextAt)
        })
        return
      }
      await this.schedule(scope)
      if (signal) {
        await this.drainLeaves(scope)
        await this.applyLeave(scope, signal)
      }
    })
  }

  requestFix(scope: QueueScope, workspaceId: string, restack: QueueRestack) {
    return this.run(() => {
      this.checkName(scope)
      return this.fixes.request(scope, workspaceId, restack)
    })
  }

  reportFix(scope: QueueScope, result: QueueFixEnd): Promise<void> {
    return this.run(() => {
      this.checkName(scope)
      return this.fixes.report(scope, result)
    })
  }

  async alarm(): Promise<boolean> {
    const scope = await this.context.storage.get<QueueScope>(QUEUE_SCOPE_KEY)
    if (!scope) return false
    this.checkName(scope)
    await this.run(async () => {
      if (await this.merges.resume()) return
      try {
        await this.drainLeaves(scope)
        await stepQueue(this.runtime, scope)
        if (this.runtime.env.GITHUB_APP_PRIVATE_KEY) {
          const restack = await this.restacks.advance(scope)
          if (restack) await this.merges.automatic(scope, restack)
        } else {
          await this.fixes.advance(scope)
          await this.merges.automatic(scope)
        }
      } catch {
        warnWorker({ kind: 'merge_queue_step_retry' })
        await this.context.storage.transaction((storage) =>
          saveQueueAlarm(
            storage,
            scope,
            this.runtime.dependencies.now() + MERGE_RETRY_MS,
          ),
        )
      }
    })
    return true
  }
}
