import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'
import { workspaceRuntime } from '../lifecycle/runtime'
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
    workspaceRuntime(env, dependencies),
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
