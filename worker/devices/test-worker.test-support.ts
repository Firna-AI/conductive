import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { app } from '../app'
import type { AppEnv } from '../env'
import { Workspace as ProductWorkspace } from '../workspace'
import { deviceTestTarget, ManualDeviceClock } from './clock.test-support'

export class Workspace extends ProductWorkspace {
  private readonly testStorage: DurableObjectStorage
  private readonly testContext: DurableObjectState
  private readonly clock: ManualDeviceClock
  constructor(
    context: DurableObjectState,
    env: AppEnv & { WORKSPACES: DurableObjectNamespace<ProductWorkspace> },
  ) {
    const clock = new ManualDeviceClock()
    super(context, env, clock.now)
    this.clock = clock
    this.testStorage = context.storage
    this.testContext = context
    context.blockConcurrencyWhile(() => clock.restore(context.storage))
  }
  fetchDeviceRequest(request: Request): Promise<Response> {
    return super.fetch(request)
  }
  async fetch(request: Request): Promise<Response> {
    const clockResponse = await this.clock.route(
      request,
      this.testContext,
      () => this.alarm(),
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
