import { API_PATHS } from '../src/shared/api'
import { HEALTH_PATH, type HealthResponse } from '../src/shared/health'
import type { AppDependencies, AppEnv } from './env'
import { hostStub, hostSurface } from './hosts'
import { errorResponse, HttpError, privateResponse } from './http'
import { route } from './routes'
import { finishSignIn, startSignIn } from './security/auth'
import { appContentSecurityPolicy } from './security/content-security'
import { cookie, OAUTH_COOKIE } from './security/cookies'
import { randomToken } from './security/crypto'
import { finishDesktopSignIn } from './security/desktop-auth'
import { DESKTOP_EXCHANGE_PATH } from './security/desktop-contract'
import { desktopCors, desktopPreflight } from './security/desktop-origin'
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
      let appApi = false
      const respond = (response: Response) => {
        privateResponse(response)
        return appApi ? desktopCors(request, response) : response
      }
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
        appApi = surface === 'app' && path.startsWith('/api/')
        if (surface === 'app') {
          checkOrigin(request, env)
          if (appApi && !upgrade) {
            const preflight = desktopPreflight(request)
            if (preflight) return privateResponse(preflight)
          }
          if (!path.startsWith('/api/') && env.ASSETS) {
            const asset = await env.ASSETS.fetch(request)
            const response = new Response(asset.body, asset)
            response.headers.set(
              'Content-Security-Policy',
              appContentSecurityPolicy(
                env.APP_ORIGIN || new URL(request.url).origin,
                env.PREVIEW_DOMAIN ? [`https://*.${env.PREVIEW_DOMAIN}`] : [],
              ),
            )
            return response
          }
        }
        if (surface !== 'app' || !path.startsWith('/api/')) {
          return privateResponse(hostStub(surface))
        }
        if (health) return respond(healthResponse())
        if (
          request.method === 'GET' &&
          !upgrade &&
          (path === API_PATHS.githubSignIn || path === API_PATHS.githubCallback)
        ) {
          return respond(
            await (path === API_PATHS.githubSignIn
              ? startSignIn(env, dependencies, request)
              : finishSignIn(request, env, dependencies)),
          )
        }
        if (
          path === DESKTOP_EXCHANGE_PATH &&
          request.method === 'POST' &&
          !upgrade
        ) {
          return respond(await finishDesktopSignIn(request, env, dependencies))
        }
        const context = await gate(request, env, dependencies.now())
        return respond(await route(request, env, context, dependencies))
      } catch (error) {
        const response = errorResponse(error)
        if (path === API_PATHS.githubCallback) {
          response.headers.append('Set-Cookie', cookie(OAUTH_COOKIE, '', 0))
        }
        return respond(response)
      }
    },
  }
}

function healthResponse(): Response {
  return privateResponse(
    Response.json({ status: 'ok' } satisfies HealthResponse),
  )
}
