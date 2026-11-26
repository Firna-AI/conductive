import { API_PATHS } from '../src/shared/api'
import type { SessionResponse } from '../src/shared/account'
import { bootRoute } from './app-api/boot'
import { codexDeviceRoute } from './app-api/codex-device'
import type { CodexTaskOwner } from './codex-auth/tasks'
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
import { continueRoute } from './app-api/continue'
import { repositoryChangeRoute } from './app-api/repository-change'
import { restartRoute } from './app-api/restart'
import { automationsRoute } from './automations/route'
import { automationRunsRoute } from './automations/run-route'
import { hasAppAccess } from './waitlist/data'
import { waitlistRoute } from './waitlist/route'
import { feedbackRoute } from './app-api/feedback'
import { branchesRoute } from './app-api/branches'
import { secretsRoute } from './app-api/secrets'
import { capabilitiesRoute } from './app-api/capabilities'
import { mergeQueueRoute } from './app-api/merge-queue'

export { routeDevice } from './devices/router'

export async function route(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
  codexTasks: CodexTaskOwner,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
): Promise<Response> {
  const secrets = await secretsRoute(request, env, context, dependencies)
  if (secrets) return secrets
  const capabilities = await capabilitiesRoute(
    request,
    env,
    context,
    dependencies,
  )
  if (capabilities) return capabilities
  const codexDevice = await codexDeviceRoute(
    request,
    env,
    context,
    dependencies,
    codexTasks,
  )
  if (codexDevice) return codexDevice
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
  const runs = await automationRunsRoute(request, env, context, dependencies)
  if (runs) return runs
  const automations = await automationsRoute(
    request,
    env,
    context,
    dependencies,
  )
  if (automations) return automations
  const branches = await branchesRoute(request, env, context, dependencies)
  if (branches) return branches
  const featureShell = await featureShellRoute(
    request,
    env,
    context,
    dependencies,
  )
  if (featureShell) return featureShell
  const mergeQueue = await mergeQueueRoute(request, env, context)
  if (mergeQueue) return mergeQueue
  const archive = await archiveRoute(request, env, context)
  if (archive) return archive
  const continued = await continueRoute(request, env, context)
  if (continued) return continued
  const changed = await repositoryChangeRoute(request, env, context)
  if (changed) return changed
  const restart = await restartRoute(request, env, context, dependencies)
  if (restart) return restart
  const boot = await bootRoute(request, env, context, dependencies)
  if (boot) return boot
  const shell = await shellRoute(request, env, context, dependencies, execution)
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
