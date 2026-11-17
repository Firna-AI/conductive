import { workspacePaths } from '../../src/shared/workspaces'
import type { AppDependencies, AppEnv } from '../env'
import { requireFeatureResult } from '../features/result'
import { restartWorkspaceSoftware } from '../lifecycle/software-restart'
import type { RequestContext } from '../security/gate'
import { workspaceChildId } from './workspace-path'
import { workspaceBinding } from './workspace-state'

/** Restart of the software of a running workspace, from its header state. */
export async function restartRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: Pick<AppDependencies, 'fetch'>,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const path = new URL(request.url).pathname
  const id = workspaceChildId(path, orgId)
  if (!id || request.method !== 'POST') return null
  if (path !== workspacePaths.restart(orgId, id)) return null
  const object = workspaceBinding(env).getByName(id)
  const result = await restartWorkspaceSoftware({
    env,
    dependencies,
    orgId,
    workspaceId: id,
    userId: context.user.id,
    step: async (step) => {
      requireFeatureResult(await object.softwareRestart(id, step))
    },
  })
  return Response.json(result)
}
