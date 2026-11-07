import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'
import { workspaceLifecycleEndpoint } from '../lifecycle/workspace-transport'
import { suspendUser } from './suspend-user'

export async function handleOperatorRequest(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/api\/operator\/users\/([1-9]\d*)\/suspension$/,
  )
  if (!match || request.method !== 'POST') return null
  const operators =
    env.OPERATOR_GITHUB_IDS?.split(',').map((id) => id.trim()) ?? []
  if (!operators.includes(String(context.user.githubId)))
    throw new HttpError(
      403,
      'operator_required',
      'Operator access is required.',
    )
  const result = await suspendUser(
    {
      env,
      dependencies,
      workspace: (id) => {
        if (!env.WORKSPACES)
          throw new HttpError(
            503,
            'service_unavailable',
            'The app is not available. Try again.',
          )
        return workspaceLifecycleEndpoint(
          env.WORKSPACES.getByName(id, { locationHint: 'weur' }),
          env,
        )
      },
    },
    Number(match[1]),
    context.user.id,
  )
  return Response.json(result, {
    status:
      result.pendingWorkspaceIds.length || result.pendingBuildIds.length
        ? 202
        : 200,
  })
}
