import { API_PATHS, orgPath } from '../src/shared/api'
import { bootRoute } from './app-api/boot'
import { chatLifecycleRoute } from './app-api/lifecycle'
import { shellRoute } from './app-api/shell'
import { leaveOrgRoute } from './app-api/leave-org'
import { createOrg, listOrgs } from './data/orgs'
import type { AppDependencies, AppEnv } from './env'
import { HttpError, requiredString } from './http'
import { signOut } from './security/auth'
import type { RequestContext } from './security/gate'
import { handleOperatorRequest } from './operator/route'

export { routeDevice } from './devices/router'

export async function route(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
): Promise<Response> {
  const operator = await handleOperatorRequest(
    request,
    env,
    context,
    dependencies,
  )
  if (operator) return operator
  const leave = await leaveOrgRoute(request, env, context, dependencies)
  if (leave) return leave
  const boot = await bootRoute(request, env, context, dependencies)
  if (boot) return boot
  const shell = await shellRoute(request, env, context, dependencies)
  if (shell) return shell
  const lifecycle = await chatLifecycleRoute(
    request,
    env,
    context,
    dependencies,
    execution,
  )
  if (lifecycle) return lifecycle
  const path = new URL(request.url).pathname
  if (path === API_PATHS.session && request.method === 'GET') {
    return Response.json({ user: context.user })
  }
  if (path === API_PATHS.signOut && request.method === 'POST') {
    return signOut(env, context.sessionId)
  }
  if (path === API_PATHS.orgs) {
    if (request.method === 'GET') {
      return Response.json({ orgs: await listOrgs(env.DB, context.user.id) })
    }
    if (request.method === 'POST') {
      const org = await createOrg(
        env.DB,
        dependencies.randomToken(),
        requiredString(context.body?.name),
        context.user.id,
        dependencies.now(),
      )
      return Response.json({ org }, { status: 201 })
    }
  }
  if (context.org) {
    if (path === orgPath(context.org.id) && request.method === 'GET') {
      return Response.json({ org: context.org })
    }
  }
  throw new HttpError(404, 'not_found', 'The page is not available.')
}
