import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'
import { workspaceRuntime } from '../lifecycle/runtime'
import { suspendUser } from './suspend-user'
import { suspendOrg } from './suspend-org'

export async function handleOperatorRequest(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/api\/operator\/(users|orgs)\/([^/]+)\/suspension$/,
  )
  if (!match || request.method !== 'POST') return null
  if (match[1] === 'users' && !/^[1-9]\d*$/.test(match[2])) return null
  const operators =
    env.OPERATOR_GITHUB_IDS?.split(',').map((id) => id.trim()) ?? []
  if (!operators.includes(String(context.user.githubId)))
    throw new HttpError(
      403,
      'operator_required',
      'Operator access is required.',
    )
  const runtime = workspaceRuntime(env, dependencies)
  let target: string
  try {
    target = decodeURIComponent(match[2])
  } catch {
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  }
  const result =
    match[1] === 'orgs'
      ? await suspendOrg(runtime, target, context.user.id)
      : await suspendUser(runtime, Number(target), context.user.id)
  return Response.json(result, {
    status:
      result.pendingWorkspaceIds.length || result.pendingBuildIds.length
        ? 202
        : 200,
  })
}
