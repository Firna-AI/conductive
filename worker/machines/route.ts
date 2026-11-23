import { HOST_PATH } from '../../src/shared/host'
import type { AppEnv } from '../env'
import { hostToken, machinesBinding, tokenRequired } from './authorization'

export async function routeHost(
  request: Request,
  env: AppEnv,
): Promise<Response | null> {
  if (new URL(request.url).pathname !== HOST_PATH) return null
  const { objectId } = hostToken(request)
  const machines = machinesBinding(env)
  let id: DurableObjectId
  try {
    id = machines.idFromString(objectId)
  } catch {
    throw tokenRequired()
  }
  const response = await machines.get(id).fetch(request)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    ...(response.webSocket && { webSocket: response.webSocket }),
  })
}
