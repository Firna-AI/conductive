import type { AppEnv } from '../env'
import { machineWorkspace } from '../devices/access'
import { forwardWorkspaceRequest } from '../chat/router'

export async function routeSecretTool(request: Request, env: AppEnv) {
  const workspace = await machineWorkspace(request, env)
  return forwardWorkspaceRequest(request, env, workspace.id)
}
