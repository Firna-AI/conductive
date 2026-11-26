import type { AgentWatchSessionResponse } from '../../src/shared/generated/AgentWatchSessionResponse'
import type { LifecycleEnvironment } from '../lifecycle/runtime'
import {
  LIFECYCLE_FENCE_KEY,
  type ReceiverFence,
} from '../members/receiver-fence'
import type { ToolSessionAccess } from '../tools/services'
import type { createWorkspaceIntegration } from './workspace-integration'
import {
  SessionWatchRecords,
  type ReadySessionWatch,
  type ToolSessionWatch,
} from './session-watch-records'
import { registerSessionWatch } from './session-watch-registration'
import { readySessionWatches, watchEnd } from './session-watch-end'
import { acceptSessionWatchNotice } from './session-watch-notice'
import { resumeSessionWatch } from './session-watch-resume'

type WatchIntegration = Pick<
  ReturnType<typeof createWorkspaceIntegration>,
  'chat' | 'controller' | 'alarms' | 'storage' | 'now' | 'withGeneration'
>

export class SessionWatches {
  private readonly env: LifecycleEnvironment
  private readonly integration: WatchIntegration
  private readonly context: DurableObjectState

  constructor(
    env: LifecycleEnvironment,
    integration: WatchIntegration,
    context: DurableObjectState,
  ) {
    this.env = env
    this.integration = integration
    this.context = context
  }

  register(
    input: ToolSessionWatch,
    authorize: () => Promise<ToolSessionAccess>,
  ): Promise<AgentWatchSessionResponse> {
    const { chat, alarms, now } = this.integration
    return chat.runLifecycle(async () =>
      registerSessionWatch(
        chat.operation(input.workspaceId),
        input,
        await authorize(),
        this.env.APP_ORIGIN,
        (at, earlier) => alarms.set('session-watches', at, earlier),
        now(),
      ),
    )
  }

  async accept(watch: ReadySessionWatch) {
    const { chat, alarms, storage, now, withGeneration } = this.integration
    const workspaceId = watch.caller.workspaceId
    if (!this.env.WORKSPACES.idFromName(workspaceId).equals(this.context.id))
      return null
    const receipt = await chat.runLifecycle((turn) =>
      withGeneration(turn, async () => {
        const fence = await storage.get<ReceiverFence>(LIFECYCLE_FENCE_KEY)
        if (fence?.mode === 'purged') return { state: 'suppressed' as const }
        if (fence && fence.mode !== 'active') return null
        return acceptSessionWatchNotice(
          chat.operation(workspaceId),
          watch,
          this.env,
          {
            randomId: () => crypto.randomUUID(),
            now,
            sessionWatchAlarm: (at, earlier) =>
              alarms.set('session-watches', at, earlier),
          },
          fence?.generation ?? 0,
        )
      }),
    )
    if (receipt?.state === 'accepted')
      this.context.waitUntil(this.resume(watch.id))
    return receipt?.state ?? null
  }

  async alarm(): Promise<void> {
    const { chat, storage, alarms, now } = this.integration
    const workspaceId = await chat.store.workspaceId()
    if (!workspaceId) return
    const ready = await chat.runLifecycle(async () => {
      const records = new SessionWatchRecords(storage)
      if (!(await records.active())) return []
      const operation = chat.operation(workspaceId)
      await operation.change(async (view) => {
        const ids = new Set(
          (await view.watches.activeTargets())
            .filter((watch) => watch.stage === 'pending')
            .map((watch) => watch.turnId),
        )
        for (const id of ids) {
          const turn = await view.turn(id)
          if (turn && watchEnd(turn.state))
            await readySessionWatches(view, turn)
        }
      })
      const ready = await operation.read(async (view) =>
        (await view.watches.activeTargets()).filter(
          (watch): watch is ReadySessionWatch => watch.stage === 'ready',
        ),
      )
      // Replace this expired run's ownership before delivery releases the queue.
      const due = await records.due(now())
      await alarms.set('session-watches', due === null ? null : now() + 30_000)
      return ready
    })
    for (const watch of ready) {
      try {
        // Both queues have been released, including for a same-workspace watch.
        const outcome = await this.env.WORKSPACES.getByName(
          watch.caller.workspaceId,
        ).acceptSessionWatch(watch)
        if (!outcome) continue
        await chat.changeWorkspace(workspaceId, async (view) => {
          const current = await view.watches.target(watch.id)
          if (current?.stage === 'ready')
            await view.watches.saveTarget({
              ...current,
              stage: 'settled',
              outcome,
            })
        })
      } catch {
        // A durable target remains ready until the caller acknowledges its receipt.
      }
    }
    const receipts = await chat.readWorkspace(workspaceId, (view) =>
      view.watches.pendingResumes(),
    )
    for (const receipt of receipts)
      if (receipt.state === 'accepted' && receipt.resume === 'pending')
        await this.resume(receipt.watch.id)
    await this.schedule()
  }

  async resume(id: string): Promise<void> {
    const { chat, controller, now, withGeneration } = this.integration
    const workspaceId = await chat.store.workspaceId()
    if (!workspaceId) return
    try {
      await chat.runLifecycle((turn) =>
        withGeneration(turn, async () => {
          const operation = chat.operation(workspaceId)
          await operation.read((view) => view.watches.assertActive())
          const receipt = await operation.read((view) =>
            view.watches.receipt(id),
          )
          if (receipt?.state !== 'accepted' || receipt.resume !== 'pending')
            return
          const resume = await resumeSessionWatch(
            chat,
            operation,
            receipt,
            this.env,
            controller,
            now,
          )
          await operation.change((view) =>
            view.watches.saveReceipt({ ...receipt, resume }),
          )
        }),
      )
    } catch {
      // The caller owns retry after acceptance, independently of target delivery.
    }
    await this.schedule()
  }

  schedule(): Promise<void> {
    const { chat, storage, now, alarms } = this.integration
    return chat.runLifecycle(async () => {
      if (!(await new SessionWatchRecords(storage).active())) return
      const due = await new SessionWatchRecords(storage).due(now())
      await alarms.set(
        'session-watches',
        due === null ? null : now() + 30_000,
        true,
      )
    })
  }
}
