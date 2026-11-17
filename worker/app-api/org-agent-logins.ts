import {
  orgAgentLoginPath,
  orgSettingsPaths,
  refreshOrgAgentLoginModelsPath,
} from '../../src/shared/org-settings'
import type {
  OrgAgentLoginsResponse,
  RefreshOrgAgentLoginModelsResponse,
  UpdateOrgAgentLoginResponse,
} from '../../src/shared/org-agent-logins'
import { invalidInput } from '../chat/inputs'
import type { AppDependencies, AppEnv } from '../env'
import { requireOrgAdmin, requireOrgMember } from '../members/permissions'
import { refreshEndpointModels } from '../model-gateway/endpoint-model-refresh'
import type { RequestContext } from '../security/gate'
import { configuredModels } from './models'
import {
  removeOrgAgentLogin,
  updateOrgAgentLogin,
} from './org-agent-login-data'
import { readOrgAgentLogins } from './org-agent-login-read'
import { readDefaultAgentLogins } from './default-agent-logins'
import { saveOrgLogin } from './org-agent-login-save'

export async function orgAgentLoginsRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (!context.org) return null
  const orgId = context.org.id
  const userId = context.user.id
  const path = new URL(request.url).pathname
  if (
    path === orgSettingsPaths.agentLogins(orgId) &&
    request.method === 'GET'
  ) {
    const org = await requireOrgMember(env.DB, orgId, userId)
    return Response.json({
      defaultLogins: await readDefaultAgentLogins(env, userId, orgId),
      agentLogins: await readOrgAgentLogins(
        env.DB,
        orgId,
        org.role === 'admin' && !org.suspension
          ? () => configuredModels(env)
          : undefined,
      ),
    } satisfies OrgAgentLoginsResponse)
  }
  const agent = (['claude', 'codex'] as const).find(
    (agent) =>
      (path === orgAgentLoginPath(orgId, agent) &&
        ['PUT', 'PATCH', 'DELETE'].includes(request.method)) ||
      (path === refreshOrgAgentLoginModelsPath(orgId, agent) &&
        request.method === 'POST'),
  )
  if (!agent) return null
  await requireOrgAdmin(env.DB, orgId, userId)
  if (request.method === 'PUT')
    return saveOrgLogin(env, context, dependencies, orgId, agent)
  if (request.method === 'POST') {
    const read = await refreshEndpointModels(
      env,
      { orgId },
      agent,
      dependencies,
      { adminId: userId },
    )
    await requireOrgAdmin(env.DB, orgId, userId)
    return Response.json({
      modelListReadFailed: !read,
    } satisfies RefreshOrgAgentLoginModelsResponse)
  }
  if (request.method === 'DELETE') {
    await removeOrgAgentLogin(env.DB, orgId, userId, agent)
    await requireOrgAdmin(env.DB, orgId, userId)
    return new Response(null, { status: 204 })
  }
  if (typeof context.body?.useForEveryMember !== 'boolean')
    return invalidInput()
  await updateOrgAgentLogin(
    env.DB,
    orgId,
    userId,
    agent,
    context.body.useForEveryMember,
  )
  await requireOrgAdmin(env.DB, orgId, userId)
  const login = (
    await readOrgAgentLogins(env.DB, orgId, () => configuredModels(env))
  ).find((login) => login.agent === agent) ?? { agent, connected: false }
  return Response.json(login satisfies UpdateOrgAgentLoginResponse)
}
