import { refreshAgentLoginModelsPath } from '../../src/shared/account'
import type { AppDependencies, AppEnv } from '../env'
import { refreshEndpointModels } from '../model-gateway/endpoint-model-refresh'
import type { RequestContext } from '../security/gate'

export async function endpointModelsRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (request.method !== 'POST') return null
  const path = new URL(request.url).pathname
  const agent = (['claude', 'codex'] as const).find(
    (agent) => path === refreshAgentLoginModelsPath(agent),
  )
  if (!agent) return null
  await refreshEndpointModels(env, context.user.id, agent, dependencies)
  return new Response(null, { status: 204 })
}
