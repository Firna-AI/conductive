import { leaveOrgPath } from '../../src/shared/orgs'
import type { AppDependencies, AppEnv } from '../env'
import { workspaceOwnerChangedHook } from '../lifecycle/ownership-maintenance'
import { workspaceRuntime } from '../lifecycle/runtime'
import { removeOrgMember } from '../members/membership'
import type { RequestContext } from '../security/gate'

export async function leaveOrgRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (
    !context.org ||
    request.method !== 'POST' ||
    new URL(request.url).pathname !== leaveOrgPath(context.org.id)
  )
    return null
  await removeOrgMember(
    env.DB,
    context.org.id,
    context.user.id,
    context.user.id,
    dependencies.now(),
    {
      workspaceOwnerChanged: workspaceOwnerChangedHook(
        workspaceRuntime(env, dependencies),
      ),
    },
  )
  return new Response(null, { status: 204 })
}
