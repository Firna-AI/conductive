import { API_PATHS } from '../src/shared/api'
import { HEALTH_PATH, type HealthResponse } from '../src/shared/health'
import type { AppDependencies, AppEnv } from './env'
import { hostStub, hostSurface, marketingResponse } from './hosts'
import { errorResponse, HttpError, privateResponse } from './http'
import { route } from './routes'
import { finishSignIn, startSignIn } from './security/auth'
import { cookie, OAUTH_COOKIE } from './security/cookies'
import { randomToken } from './security/crypto'
import { checkOrigin, gate } from './security/gate'

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
      const upgrade = request.headers.has('Upgrade')
      const health =
        path === HEALTH_PATH && request.method === 'GET' && !upgrade
      try {
        // A binding-free health call also supports the bootstrap smoke check.
        if (!env && health) return healthResponse()
        if (!env)
          throw new HttpError(
            503,
            'service_unavailable',
            'The app is not available. Try again.',
          )
        const surface = hostSurface(request, env)
        if (surface === 'marketing') {
          return await marketingResponse(request, env, dependencies.now())
        }
        if (surface === 'app') {
          checkOrigin(request, env)
          if (!path.startsWith('/api/') && env.ASSETS) {
            return env.ASSETS.fetch(request)
          }
        }
        if (surface !== 'app' || !path.startsWith('/api/')) {
          return privateResponse(hostStub(surface))
        }
        if (health) return healthResponse()
        if (
          request.method === 'GET' &&
          !upgrade &&
          (path === API_PATHS.githubSignIn || path === API_PATHS.githubCallback)
        ) {
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

function healthResponse(): Response {
  return privateResponse(
    Response.json({ status: 'ok' } satisfies HealthResponse),
  )
}
