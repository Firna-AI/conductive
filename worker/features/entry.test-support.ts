import { createApp } from '../application'
import { DEVICE_TEST_NOW } from '../devices/clock.test-support'
import { NativeAlarmWorkspace } from '../lifecycle/native-alarm-workspace.test-support'
import type { ReceiverOwnership } from '../members/workspace-receiver'
import type { AppEnv } from '../env'
import { featureResult } from './result'
import { scheduleWorkspaceAlarm } from './alarms'
import type { ImageCoordinatorState } from '../lifecycle/image-timers'
import { number, record, sendMessage, string } from '../chat/inputs'
import { readJsonObject } from '../http/json-body'

const app = createApp({ now: () => DEVICE_TEST_NOW })

export class Workspace extends NativeAlarmWorkspace {
  private readonly instance = crypto.randomUUID()
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

  async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname === '/__test/features') {
      const input = await readJsonObject(request)
      const action = string(input.action)
      if (action === 'connections')
        return Response.json(await this.inspectFeatureConnections())
      if (action === 'state')
        return Response.json(await this.inspectFeatureState())
      if (action === 'summary')
        return Response.json(await this.readChatWorkspaceSummary())
      if (action === 'initialize') {
        const data = record(input.input)
        const turn = record(data.firstTurn)
        await this.initializeLifecycle({
          workspaceId: string(data.workspaceId),
          orgId: string(data.orgId),
          firstMessage: sendMessage(record(data.firstMessage)),
          firstTurn: {
            turnId: string(turn.turnId),
            sessionId: string(turn.sessionId),
            senderUserId: string(turn.senderUserId),
          },
        })
      } else if (action === 'stopped') await this.lifecycleStopped()
      else if (action === 'seed')
        await this.seedFeatureState(record(input.values))
      else if (action === 'advance')
        await this.advanceStartAlarm(
          input.at === undefined ? undefined : number(input.at),
        )
      else return new Response(null, { status: 404 })
      return Response.json(null)
    }
    if (
      new URL(request.url).pathname === '/__test/continue-restart' &&
      request.method === 'POST'
    )
      this.ctx.abort(
        'Restart the Continue fixture with durable work still pending.',
      )
    return super.fetch(request)
  }

  async runSecurityAlarmAt(at: number): Promise<void> {
    await this.advanceStartAlarm(at)
  }

  async inspectFeatureConnections() {
    await this.chat.runLifecycle(async () => undefined)
    return {
      instance: this.instance,
      sockets: this.ctx.getWebSockets().map((socket) => socket.readyState),
    }
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
      await this.ctx.storage.put(
        key,
        key.startsWith('alarm:') && typeof value === 'number'
          ? Math.max(this.testAlarmTime(), value)
          : value,
      )
    if ('org-image:coordinator' in values) {
      const image = await this.ctx.storage.get<ImageCoordinatorState>(
        'org-image:coordinator',
      )
      if (image)
        await this.integration.alarms.set(
          'lifecycle:image',
          Math.max(this.testAlarmTime(), image.nextAt),
        )
    }
    await this.ctx.storage.transaction((transaction) =>
      scheduleWorkspaceAlarm(transaction),
    )
  }
}

export default {
  ...app,
  async fetch(request: Request, env: AppEnv, execution: ExecutionContext) {
    const url = new URL(request.url)
    if (
      url.pathname === '/__test/continue-restart' ||
      url.pathname === '/__test/features'
    ) {
      const id = url.searchParams.get('workspace')
      if (!id || !env.WORKSPACES) return new Response(null, { status: 400 })
      return env.WORKSPACES.getByName(id).fetch(request)
    }
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
