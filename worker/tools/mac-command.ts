import type { AppEnv } from '../env'
import { machineWorkspace } from '../devices/access'
import { deviceResponse, deviceStub } from '../devices/internal'

/** The real application dispatches only the fixed Mac-command machine paths. */
export async function routeMacCommand(
  request: Request,
  env: AppEnv,
): Promise<Response> {
  const workspace = await machineWorkspace(request, env)
  return deviceResponse(await deviceStub(env, workspace.id).fetch(request))
}
