import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { app } from '../app'
import type { AppEnv } from '../env'
import { Workspace as ProductWorkspace } from '../workspace'
import {
  deviceTestPath,
  deviceTestTarget,
  ManualDeviceClock,
} from './clock.test-support'
import { DEVICE_BROKER_PREFIX } from './paths'

export class Workspace extends ProductWorkspace {
  private readonly testStorage: DurableObjectStorage
  private readonly testContext: DurableObjectState
  private readonly clock: ManualDeviceClock
  private readonly instance = crypto.randomUUID()
  constructor(
    context: DurableObjectState,
    env: AppEnv & { WORKSPACES: DurableObjectNamespace<ProductWorkspace> },
  ) {
    const clock = new ManualDeviceClock()
    super(context, env, clock.now, {
      socketAutoResponseAt: (socket) =>
        clock.autoResponseAt(context.getWebSocketAutoResponseTimestamp(socket)),
    })
    this.clock = clock
    this.testStorage = context.storage
    this.testContext = context
    context.blockConcurrencyWhile(() => clock.restore(context.storage))
  }
  fetchDeviceRequest(request: Request): Promise<Response> {
    return super.fetch(request)
  }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const target = deviceTestTarget(url)
    if (
      target &&
      url.pathname === new URL(deviceTestPath('ready', target), url).pathname
    ) {
      const current = target.startsWith(DEVICE_BROKER_PREFIX)
        ? await this.devices.operation(target, {
            type: 'broker.current',
            userId: target.slice(DEVICE_BROKER_PREFIX.length),
            sessionId: `${target.slice(DEVICE_BROKER_PREFIX.length)}-session`,
          })
        : null
      await this.clock.capture(this.testContext)
      return Response.json({
        instance: this.instance,
        current,
        socketCount: this.testContext.getWebSockets().length,
        nativeSockets: this.testContext.getWebSockets().map((socket) => ({
          state: socket.readyState,
          attachment: socket.deserializeAttachment(),
        })),
        autoResponse:
          this.testContext.getWebSocketAutoResponse()?.request ?? null,
      })
    }
    const clockResponse = await this.clock.route(
      request,
      this.testContext,
      async () => {
        await this.alarm()
        await this.settledAlarms()
      },
    )
    if (clockResponse) return clockResponse
    if (new URL(request.url).pathname === '/__test/clear-device-records') {
      const keys = [
        ...(await this.testStorage.list({ prefix: 'devices:v1:' })).keys(),
      ]
      await this.testStorage.delete(keys)
      return Response.json({ cleared: true })
    }
    return super.fetch(request)
  }
}

// Only the fixture mounts pre-existing chat routes. Product dispatch stays owned
// by the app-wiring milestone. Device requests always use the real application.
export default {
  fetch(
    request: Request,
    env: AppEnv & { WORKSPACES: DurableObjectNamespace<ProductWorkspace> },
  ) {
    const url = new URL(request.url)
    const deviceObject = deviceTestTarget(url)
    const workspaceId = url.pathname.match(/\/workspaces\/([^/]+)/)?.[1]
    if (
      (workspaceId && !url.pathname.includes('/device-commands')) ||
      url.pathname === MACHINE_PATHS.runner ||
      url.pathname === '/__test/clear-device-records' ||
      deviceObject
    ) {
      return env.WORKSPACES.get(
        env.WORKSPACES.idFromName(
          deviceObject ?? workspaceId ?? 'device-workspace',
        ),
      ).fetch(request)
    }
    return app.fetch(request, env)
  },
}
