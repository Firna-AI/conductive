import {
  workspacePath,
  workspacePaths,
  workspacesPath,
} from '../../src/shared/workspaces'
import { runnerSoftware } from '../configuration'
import type { AppDependencies, AppEnv } from '../env'
import { handleLifecycleRequest } from '../lifecycle/browser'
import { imageRuntime, workspaceRuntime } from '../lifecycle/runtime'
import { readWorkspace } from '../lifecycle/workspace-data'
import type { RequestContext } from '../security/gate'
import { workspaceChildId } from './workspace-path'
import {
  requireWritableWorkspace,
  workspaceBinding,
  workspaceForViewer,
} from './workspace-state'

export async function chatLifecycleRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const path = new URL(request.url).pathname
  const workspaceId = workspaceChildId(path, orgId)
  const create = path === workspacesPath(orgId) && request.method === 'POST'
  const read =
    workspaceId &&
    path === workspacePath(orgId, workspaceId) &&
    request.method === 'GET'
  const action =
    workspaceId &&
    request.method === 'POST' &&
    [
      workspacePaths.open(orgId, workspaceId),
      workspacePaths.resume(orgId, workspaceId),
      workspacePaths.activity(orgId, workspaceId),
    ].includes(path)
  if (!create && !read && !action) return null
  if (action)
    requireWritableWorkspace(await readWorkspace(env.DB, orgId, workspaceId))
  const binding = workspaceBinding(env)
  const lifecycleEnv = { ...env, WORKSPACES: binding }
  return handleLifecycleRequest(
    request,
    context,
    {
      ...workspaceRuntime(lifecycleEnv, dependencies),
      images: imageRuntime(lifecycleEnv, dependencies),
    },
    {
      get software() {
        return runnerSoftware(env)
      },
      acceptFirstMessage: (first) =>
        binding
          .getByName(first.workspaceId, { locationHint: 'weur' })
          .acceptLifecycleFirstMessage(first),
      projectWorkspace: async (response) => ({
        ...response,
        workspace: await workspaceForViewer(
          env,
          context.user.id,
          response.workspace,
        ),
      }),
      waitUntil: (promise) => execution?.waitUntil(promise),
    },
  )
}
