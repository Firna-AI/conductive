import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { DESKTOP_ORIGIN } from './desktop-contract'

export function trustedOrigin(
  origin: string | null,
  env: Pick<AppEnv, 'APP_ORIGIN'>,
): boolean {
  return origin === env.APP_ORIGIN || origin === DESKTOP_ORIGIN
}

/** Call before the session gate. A preflight never grants an app session. */
export function desktopPreflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null
  if (request.headers.get('Origin') !== DESKTOP_ORIGIN) return null
  const method = request.headers.get('Access-Control-Request-Method')
  const headers = (request.headers.get('Access-Control-Request-Headers') ?? '')
    .toLowerCase()
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)
  if (
    !method ||
    !['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ||
    headers.some((name) => name !== 'content-type')
  ) {
    throw new HttpError(403, 'origin_forbidden', 'Open the app to continue.')
  }
  const response = new Response(null, { status: 204 })
  response.headers.set('Access-Control-Allow-Methods', method)
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return desktopCors(request, response)
}

/** Exact origin admission applies to successful and failed API responses. */
export function desktopCors(request: Request, response: Response): Response {
  response.headers.append('Vary', 'Origin')
  if (request.headers.get('Origin') === DESKTOP_ORIGIN) {
    response.headers.set('Access-Control-Allow-Origin', DESKTOP_ORIGIN)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  return response
}
