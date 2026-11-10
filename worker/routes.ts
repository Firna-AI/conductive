import { API_PATHS } from '../src/shared/api'
import type { SessionResponse } from '../src/shared/account'
import { bootRoute } from './app-api/boot'
import { chatLifecycleRoute } from './app-api/lifecycle'
import { shellRoute } from './app-api/shell'
import type { AppDependencies, AppEnv } from './env'
import { HttpError } from './http'
import { signOut } from './security/auth'
import type { RequestContext } from './security/gate'
import { handleOperatorRequest } from './operator/route'
import { featureShellRoute } from './app-api/feature-shell'
import { invitationsRoute } from './app-api/invitations'
import { membersRoute } from './members/route'
import { productionMembersHooks } from './members/composition'
import { archiveRoute } from './app-api/archive'
import { hasAppAccess } from './waitlist/data'
import { waitlistRoute } from './waitlist/route'
import { feedbackRoute } from './app-api/feedback'

export { routeDevice } from './devices/router'

export async function route(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
): Promise<Response> {
  const feedback = await feedbackRoute(request, env, context, dependencies)
  if (feedback) return feedback
  const waitlist = await waitlistRoute(request, env, context, dependencies)
  if (waitlist) return waitlist
  const operator = await handleOperatorRequest(
    request,
    env,
    context,
    dependencies,
  )
  if (operator) return operator
  const invitations = await invitationsRoute(
    request,
    env,
    context,
    dependencies,
  )
  if (invitations) return invitations
  const members = await membersRoute(
    request,
    env,
    context,
    dependencies,
    productionMembersHooks(env, dependencies),
  )
  if (members) return members
  const featureShell = await featureShellRoute(
    request,
    env,
    context,
    dependencies,
  )
  if (featureShell) return featureShell
  const archive = await archiveRoute(request, env, context)
  if (archive) return archive
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
    return Response.json({
      user: context.user,
      appAccess: await hasAppAccess(env.DB, context.user.id),
    } satisfies SessionResponse)
  }
  if (path === API_PATHS.signOut && request.method === 'POST') {
    return signOut(env, context.sessionId)
  }
  throw new HttpError(404, 'not_found', 'The page is not available.')
}
