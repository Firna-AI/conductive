import type { AppEnv } from '../env'
import { checkHost, checkOrigin, gate } from '../security/gate'

/** Keep every original gate check, without giving its JSON parser the body. */
export async function deviceBrowserGate(
  request: Request,
  env: AppEnv,
  now: number,
) {
  checkHost(request, env)
  checkOrigin(request, env)
  return gate(new Request(request.url, { headers: request.headers }), env, now)
}
