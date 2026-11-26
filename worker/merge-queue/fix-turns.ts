import { workspaceBinding } from '../app-api/workspace-state'
import { requireFeatureResult } from '../features/result'
import { HttpError } from '../http'
import { startAcceptedMessage } from '../lifecycle/accepted-message-start'
import { workspaceRuntime } from '../lifecycle/runtime'
import { warnWorker } from '../warnings'
import {
  queueId,
  type QueueLeave,
  type QueueRecord,
  type QueueScope,
} from './contracts'
import { readQueue, readQueueEntries, readQueueEntry } from './data'
import { queueChanged, queueMissing } from './errors'
import { queueFixAccess, queueFixLeave } from './fix-access'
import type { QueueFix, QueueFixEnd, QueueRestack } from './fix-contracts'
import { currentFixEntry, saveFixBarState } from './fix-data'
import { saveQueueAlarm } from './queue-alarm'
import { leaveQueue, type QueueRuntime } from './step'

const ACTIVE = 'merge-queue:active-fix'
const FIX_RETRY_MS = 30_000
const fixKey = (id: string) => `merge-queue:fix:${encodeURIComponent(id)}`

/** The queue coordinator holds its sequence for each operation. */
export class QueueFixTurns {
  private readonly runtime: QueueRuntime
  private readonly storage: DurableObjectStorage

  constructor(runtime: QueueRuntime, storage: DurableObjectStorage) {
    this.runtime = runtime
    this.storage = storage
  }

  async active() {
    const id = await this.storage.get<string>(ACTIVE)
    return id ? this.storage.get<QueueFix>(fixKey(id)) : undefined
  }

  read(id: string) {
    return this.storage.get<QueueFix>(fixKey(id))
  }

  async cancelUnsent(fix: QueueFix): Promise<boolean> {
    if (fix.state !== 'pending' || fix.mayHaveMessage) return false
    await saveFixBarState(
      this.runtime.env.DB,
      fix,
      { state: 'queued', wait: null },
      this.runtime.dependencies.now(),
    )
    await this.storage.transaction(async (storage) => {
      await storage.delete(ACTIVE)
      await storage.delete(fixKey(fix.restack.id))
    })
    return true
  }

  async request(scope: QueueScope, workspaceId: string, restack: QueueRestack) {
    const { env, dependencies } = this.runtime
    const entry = await readQueueEntry(env.DB, queueId(scope), workspaceId)
    if (!entry) throw queueMissing()
    const previous = await this.storage.get<QueueFix>(fixKey(restack.id))
    if (previous) {
      if (
        previous.entry.workspaceId !== workspaceId ||
        !(await currentFixEntry(env.DB, previous)) ||
        previous.restack.base !== restack.base ||
        previous.restack.baseHead !== restack.baseHead ||
        previous.restack.oldBase !== restack.oldBase
      )
        throw queueChanged()
      return previous
    }
    const active = await this.active()
    if (active && (await currentFixEntry(env.DB, active))) throw queueChanged()
    const { branch, pullNumber, queuerUserId, queuedAt, unitId } = entry
    const fix: QueueFix = {
      scope,
      entry: {
        workspaceId,
        branch,
        pullNumber,
        queuerUserId,
        queuedAt,
        unitId,
      },
      restack,
      messageId: dependencies.randomToken(),
      state: 'pending',
    }
    await this.storage.transaction(async (storage) => {
      await storage.put(fixKey(restack.id), fix)
      await storage.put(ACTIVE, restack.id)
      await saveQueueAlarm(storage, scope, dependencies.now())
    })
    return fix
  }

  async advance(scope: QueueScope): Promise<void> {
    const fix = await this.active()
    if (!fix || fix.state === 'ended') return
    if (fix.state === 'pending') await this.retry(scope)
    const { env } = this.runtime
    if (!(await currentFixEntry(env.DB, fix))) {
      await this.storage.delete(ACTIVE)
      return
    }
    const queue = await readQueue(env.DB, scope)
    if (!queue) return
    try {
      if (queue.trunk === queue.defaultBranch)
        await this.advanceOwned(queue, fix)
      else await this.retry(scope)
    } catch (error) {
      const leave =
        error instanceof HttpError
          ? await queueFixLeave(env.DB, queue, fix, error)
          : undefined
      if (leave) await this.leave(queue, leave)
      else {
        await this.retry(scope)
        warnWorker({ kind: 'merge_queue_fix_retry' })
      }
    }
  }

  private async leave(queue: QueueRecord, signal: QueueLeave): Promise<void> {
    const { env, dependencies } = this.runtime
    await leaveQueue(
      this.runtime,
      queue,
      await readQueueEntries(env.DB, queue.id),
      signal,
    )
    await this.storage.transaction(async (storage) => {
      await storage.delete(ACTIVE)
      await saveQueueAlarm(storage, queue, dependencies.now())
    })
  }

  private retry(scope: QueueScope): Promise<void> {
    return this.storage.transaction((storage) =>
      saveQueueAlarm(
        storage,
        scope,
        this.runtime.dependencies.now() + FIX_RETRY_MS,
      ),
    )
  }

  private async advanceOwned(
    queue: QueueRecord,
    fix: Exclude<QueueFix, { state: 'ended' }>,
  ): Promise<void> {
    const { env, dependencies } = this.runtime
    const access = await queueFixAccess(this.runtime, fix)
    const now = dependencies.now()
    if (access === 'lost') {
      const { workspaceId, branch, pullNumber } = fix.entry
      await this.leave(queue, {
        cause: 'write-access-lost',
        workspaceId,
        branch,
        pullNumber,
      })
      return
    }
    if (access === 'token') {
      await saveFixBarState(
        env.DB,
        fix,
        { state: 'waiting', wait: 'token' },
        now,
      )
      await this.retry(fix.scope)
      return
    }
    if (fix.state === 'sent') {
      await saveFixBarState(
        env.DB,
        fix,
        { state: 'restacking', wait: null },
        now,
      )
      return
    }
    const { workspaceId, queuerUserId } = fix.entry
    const target = workspaceBinding(env).getByName(workspaceId, {
      locationHint: 'weur',
    })
    const key = fixKey(fix.restack.id)
    await this.storage.put<QueueFix>(key, { ...fix, mayHaveMessage: true })
    const admission = requireFeatureResult(await target.writeMergeQueueFix(fix))
    if (admission.kind === 'waiting') {
      await saveFixBarState(
        env.DB,
        fix,
        { state: 'waiting', wait: admission.wait },
        now,
      )
    }
    if (admission.kind !== 'accepted') {
      const pending: QueueFix = {
        scope: fix.scope,
        entry: fix.entry,
        restack: fix.restack,
        messageId: fix.messageId,
        state: 'pending',
      }
      await this.storage.put(key, pending)
      return
    }
    await saveFixBarState(env.DB, fix, { state: 'restacking', wait: null }, now)
    if (admission.queued) {
      const { resume } = await startAcceptedMessage(
        workspaceRuntime(env, dependencies),
        queue.orgId,
        workspaceId,
        queuerUserId,
      )
      if (resume.state === 'failed') return
    }
    await this.storage.put<QueueFix>(key, {
      ...fix,
      state: 'sent',
      turnId: admission.turnId,
    })
  }

  async report(scope: QueueScope, result: QueueFixEnd): Promise<void> {
    const fix = await this.active()
    if (fix?.messageId !== result.messageId) return
    const { env, dependencies } = this.runtime
    if (await currentFixEntry(env.DB, fix))
      await saveFixBarState(
        env.DB,
        fix,
        { state: 'queued', wait: null },
        dependencies.now(),
      )
    await this.storage.transaction(async (storage) => {
      await storage.put<QueueFix>(fixKey(fix.restack.id), {
        ...fix,
        state: 'ended',
        result,
      })
      await storage.delete(ACTIVE)
      await saveQueueAlarm(storage, scope, dependencies.now())
    })
  }
}
