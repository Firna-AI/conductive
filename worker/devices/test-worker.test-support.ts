import { app } from '../app'
import type { AppEnv } from '../env'
import { Workspace as ProductWorkspace } from '../workspace'

export class Workspace extends ProductWorkspace {
  private readonly testStorage: DurableObjectStorage
  constructor(
    context: DurableObjectState,
    env: AppEnv & { WORKSPACES: DurableObjectNamespace },
  ) {
    super(context, env)
    this.testStorage = context.storage
  }
  async fetch(request: Request): Promise<Response> {
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
    env: AppEnv & { WORKSPACES: DurableObjectNamespace },
  ) {
    const url = new URL(request.url)
    const workspaceId = url.pathname.match(/\/workspaces\/([^/]+)/)?.[1]
    if (
      (workspaceId && !url.pathname.includes('/device-commands')) ||
      url.pathname === '/runner' ||
      url.pathname === '/__test/clear-device-records'
    ) {
      return env.WORKSPACES.get(
        env.WORKSPACES.idFromName(workspaceId ?? 'device-workspace'),
      ).fetch(request)
    }
    return app.fetch(request, env)
  },
}
