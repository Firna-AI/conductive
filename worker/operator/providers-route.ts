import { operatorProvidersPath } from '../../src/shared/operator-providers'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import type { RequestContext } from '../security/gate'
import { isOperator } from './access'
import { readOperatorProviders, updateOperatorProviders } from './providers'

export async function operatorProvidersRoute(
  request: Request,
  env: AppEnv,
  context: RequestContext,
  dependencies: AppDependencies,
): Promise<Response | null> {
  if (
    new URL(request.url).pathname !== operatorProvidersPath() ||
    !['GET', 'PUT'].includes(request.method)
  )
    return null
  if (!isOperator(env, context.user.githubId))
    throw new HttpError(
      403,
      'operator_required',
      'Operator access is required.',
    )
  return Response.json(
    await (request.method === 'GET'
      ? readOperatorProviders(env)
      : updateOperatorProviders(
          env,
          context.body,
          context.user.id,
          dependencies.now,
        )),
  )
}
