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
import { liftOrgSuspension, liftUserSuspension } from './lift'
import { numericGitHubId } from './directory'
import { operatorWaitlistRoute } from './waitlist-route'

export async function handleOperatorRequest(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  const waitlist = await operatorWaitlistRoute(
    request,
    env,
    context,
    dependencies,
  )
  if (waitlist) return waitlist
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
  const suspensionWrite =
    request.method === 'POST' || request.method === 'DELETE'
  if (!overview && !directory && (!match || !suspensionWrite)) return null
  if (
    request.method === 'POST' &&
    match?.[1] === 'users' &&
    !/^[1-9]\d*$/.test(match[2])
  )
    return null
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
    if (request.method === 'DELETE' && match[1] === 'users')
      throw new HttpError(
        404,
        'user_not_found',
        'The account is not available.',
      )
    throw new HttpError(404, 'org_not_found', 'The org is not available.')
  }
  if (request.method === 'DELETE') {
    if (match[1] === 'orgs')
      return Response.json(
        await liftOrgSuspension(runtime, target, context.user.id),
      )
    const githubId = numericGitHubId(target)
    if (githubId === null)
      throw new HttpError(
        404,
        'user_not_found',
        'The account is not available.',
      )
    return Response.json(
      await liftUserSuspension(runtime, githubId, context.user.id),
    )
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
