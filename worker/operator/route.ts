import { operatorOverviewPath } from '../../src/shared/operator'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'
import { workspaceRuntime } from '../lifecycle/runtime'
import { suspendUser } from './suspend-user'
import { suspendOrg } from './suspend-org'
import { isOperator } from './access'
import { readOperatorOverview } from './overview'
import { operatorDirectoryRoute } from './directory-route'

export async function handleOperatorRequest(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  const url = new URL(request.url)
  const path = url.pathname
  const overview = path === operatorOverviewPath() && request.method === 'GET'
  const directory =
    request.method === 'GET'
      ? path.match(/^\/api\/operator\/(orgs|users)(?:\/([^/]+))?$/)
      : null
  const match = path.match(
    /^\/api\/operator\/(users|orgs)\/([^/]+)\/suspension$/,
  )
  if (!overview && !directory && (!match || request.method !== 'POST'))
    return null
  if (match?.[1] === 'users' && !/^[1-9]\d*$/.test(match[2])) return null
  if (!isOperator(env, context.user.githubId))
    throw new HttpError(
      403,
      'operator_required',
      'Operator access is required.',
    )
  if (overview)
    return Response.json(await readOperatorOverview(env.DB, dependencies.now()))
  if (directory)
    return operatorDirectoryRoute(
      env.DB,
      url,
      directory[1] === 'orgs' ? 'orgs' : 'users',
      directory[2],
    )
  if (!match) return null
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
