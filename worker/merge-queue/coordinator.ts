import { HttpError } from '../http'
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
import { moveUnit } from './order'
import { leaveQueue, stepQueue, type QueueRuntime } from './step'
import { saveQueueOrder } from './writes'

const SCOPE = 'merge-queue:scope'

export class QueueCoordinator {
  private readonly runtime: QueueRuntime
  private readonly context: DurableObjectState
  private pending: Promise<void> = Promise.resolve()

  constructor(runtime: QueueRuntime, context: DurableObjectState) {
    this.runtime = runtime
    this.context = context
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

  private async schedule(scope: QueueScope): Promise<void> {
    const now = Math.max(1, this.runtime.dependencies.now())
    await this.context.storage.transaction(async (storage) => {
      await storage.put(SCOPE, scope)
      const earlier = await storage.getAlarm()
      if (earlier === null || earlier > now) await storage.setAlarm(now)
    })
  }

  change(
    scope: QueueScope,
    workspaceId: string,
    userId: string,
    action: QueueMemberAction,
  ): Promise<void> {
    return this.run(async () => {
      this.checkName(scope)
      const { env, dependencies } = this.runtime
      const workspace = await readMergeWorkspace(
        env.DB,
        scope.orgId,
        workspaceId,
        userId,
      )
      if (workspace.repositoryId !== scope.githubRepositoryId)
        throw queueMissing()
      const member = await repositoryMemberGitHub(
        env,
        dependencies,
        workspace,
        userId,
      )
      if (!(await member.capabilities()).canWrite) throw queueWriteRequired()
      const queue = await readQueue(env.DB, scope)
      const entries = queue ? await readQueueEntries(env.DB, queue.id) : []
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
      const entry = entries.find(
        (item) =>
          item.workspaceId === workspaceId && item.branch === workspace.branch,
      )
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
      await this.schedule(scope)
      if (!signal) return
      const db = this.runtime.env.DB
      const queue = await readQueue(db, scope)
      if (queue)
        await leaveQueue(
          this.runtime,
          queue,
          await readQueueEntries(db, queue.id),
          signal,
        )
    })
  }

  async alarm(): Promise<boolean> {
    const scope = await this.context.storage.get<QueueScope>(SCOPE)
    if (!scope) return false
    this.checkName(scope)
    await this.run(() => stepQueue(this.runtime, scope))
    return true
  }
}
