import type { AppEnv } from '../env'
import { deviceBrowserGate } from './body'
import { deviceResponse, deviceStub } from './internal'
import { deviceBrokerName, workspaceDeviceRoute } from './paths'

export async function routeDevice(
  request: Request,
  env: AppEnv,
): Promise<Response> {
  const context = await deviceBrowserGate(request, env, Date.now())
  const workspace = workspaceDeviceRoute(new URL(request.url).pathname)
  const name = workspace
    ? workspace.workspaceId
    : deviceBrokerName(context.user.id)
  return deviceResponse(await deviceStub(env, name).fetch(request))
}
