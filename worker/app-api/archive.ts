import { workspacePaths } from '../../src/shared/workspaces'
import { workspaceBinding } from './workspace-state'
import { workspaceChildId } from './workspace-path'
import type { RequestContext } from '../security/gate'
import type { AppEnv } from '../env'
import { requireFeatureResult } from '../features/result'

export async function archiveRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const path = new URL(request.url).pathname
  const id = workspaceChildId(path, orgId)
  if (!id) return null
  const archive =
    path === workspacePaths.archive(orgId, id) && request.method === 'POST'
  const restore =
    path === workspacePaths.restore(orgId, id) && request.method === 'POST'
  if (!archive && !restore) return null
  const object = workspaceBinding(env).getByName(id)
  const result = restore
    ? await object.restoreWorkspace(orgId, id, context.user.id, env.APP_ORIGIN)
    : await object.archiveWorkspace(orgId, id, context.user.id, env.APP_ORIGIN)
  return Response.json(requireFeatureResult(result))
}
