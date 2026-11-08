import app, { Workspace as ProductionWorkspace } from '../index'
import type { ReceiverOwnership } from '../members/workspace-receiver'
import type { AppEnv } from '../env'
import { featureResult } from './result'

export class Workspace extends ProductionWorkspace {
  private suspensions = 0
  private readonly observers = new Map<number, () => void>()

  async suspendMemberLifecycle(
    ownership: ReceiverOwnership,
    workspaceId: string | null,
  ) {
    const pending = super.suspendMemberLifecycle(ownership, workspaceId)
    const completed = pending.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    )
    await this.ctx.storage.transaction(async () => undefined)
    this.observers.get(++this.suspensions)?.()
    const result = await completed
    if (!result.ok) throw result.error
    return result.value
  }

  waitForSuspension(count: number): Promise<void> {
    return new Promise((resolve) => {
      if (this.suspensions >= count) resolve()
      else this.observers.set(count, resolve)
    })
  }

  advanceStartAlarm(): Promise<void> {
    return this.alarm()
  }
  async inspectFeatureState() {
    return [...(await this.ctx.storage.list()).entries()]
  }

  waitForActivity(): Promise<void> {
    return this.activity.settled()
  }

  lateSummaryOutcome() {
    return featureResult(() => this.readChatWorkspaceSummary())
  }

  lateAlarmOutcome() {
    return featureResult(() => this.integration.alarms.set('github', 0))
  }

  async seedFeatureState(values: Record<string, unknown>) {
    for (const [key, value] of Object.entries(values))
      await this.ctx.storage.put(key, value)
  }
}

export default {
  ...app,
  async fetch(request: Request, env: AppEnv, execution: ExecutionContext) {
    if (new URL(request.url).pathname === '/__test/scheduled') {
      await app.scheduled(
        { cron: '*/15 * * * *', scheduledTime: Date.now(), noRetry() {} },
        env,
      )
      return new Response(null)
    }
    return app.fetch(request, env, execution)
  },
}
