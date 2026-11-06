import { API_PATHS } from '../src/shared/api'
import { HEALTH_PATH, type HealthResponse } from '../src/shared/health'
import type { AppDependencies, AppEnv } from './env'
import { errorResponse, HttpError, privateResponse } from './http'
import { route } from './routes'
import { finishSignIn, startSignIn } from './security/auth'
import { cookie, OAUTH_COOKIE } from './security/cookies'
import { randomToken } from './security/crypto'
import { checkHost, checkOrigin, gate } from './security/gate'

export function createApp(overrides: Partial<AppDependencies> = {}) {
  const dependencies: AppDependencies = {
    fetch: (request) => fetch(request),
    now: Date.now,
    randomToken,
    ...overrides,
  }
  return {
    async fetch(request: Request, env?: AppEnv): Promise<Response> {
      const path = new URL(request.url).pathname
      // Health remains public. GitHub navigations use browser-bound state instead of a session.
      if (path === HEALTH_PATH && request.method === 'GET') {
        return privateResponse(
          Response.json({ status: 'ok' } satisfies HealthResponse),
        )
      }
      try {
        if (!env)
          throw new HttpError(
            503,
            'service_unavailable',
            'The app is not available. Try again.',
          )
        checkHost(request, env)
        if (
          request.method === 'GET' &&
          (path === API_PATHS.githubSignIn || path === API_PATHS.githubCallback)
        ) {
          checkOrigin(request, env, true)
          return privateResponse(
            await (path === API_PATHS.githubSignIn
              ? startSignIn(env, dependencies)
              : finishSignIn(request, env, dependencies)),
          )
        }
        const context = await gate(request, env, dependencies.now())
        return privateResponse(await route(request, env, context, dependencies))
      } catch (error) {
        const response = errorResponse(error)
        if (path === API_PATHS.githubCallback) {
          response.headers.append('Set-Cookie', cookie(OAUTH_COOKIE, '', 0))
        }
        return privateResponse(response)
      }
    },
  }
}
