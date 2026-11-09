import { API_PATHS } from '../src/shared/api'
import { MACHINE_PATHS } from '../src/shared/agent-tools'
import { GITHUB_SETUP_PATH } from '../src/shared/github-setup'
import { HEALTH_PATH, type HealthResponse } from '../src/shared/health'
import { SITE_FOLDER } from '../src/shared/site-build'
import type { AppDependencies, AppEnv } from './env'
import { githubSetupResponse } from './github-setup'
import { hostStub, hostSurface, marketingResponse } from './hosts'
import { errorResponse, HttpError, privateResponse } from './http'
import { requestBodyEntry } from './http/request-body'
import { route, routeDevice } from './routes'
import { workspaceBinding } from './app-api/workspace-state'
import { routeChat, routeRunner } from './chat/router'
import { isDeviceAppPath, isDeviceMachinePath } from './devices/paths'
import { routeMacCommand } from './tools/mac-command'
import { appOrigin } from './security/app-origin'
import { handleGitCredential } from './lifecycle/machine'
import {
  handleImageSourceCredential,
  IMAGE_SOURCE_CREDENTIAL_PATH,
} from './lifecycle/image-sources/credential'
import { imageRuntime, workspaceRuntime } from './lifecycle/runtime'
import { repairLifecycleAlarms } from './lifecycle/repair'
import { finishSignIn, startSignIn } from './security/auth'
import { appContentSecurityPolicy } from './security/content-security'
import { cookie, OAUTH_COOKIE } from './security/cookies'
import { randomToken } from './security/crypto'
import { finishDesktopSignIn } from './security/desktop-auth'
import { DESKTOP_EXCHANGE_PATH } from './security/desktop-contract'
import { desktopCors, desktopPreflight } from './security/desktop-origin'
import { checkOrigin } from './security/gate'
import { membersGate } from './members/gate'
import { productionMembersHooks } from './members/composition'
import { cleanupDeletedOrgs } from './members/cleanup'
import { routePreview, routeWorkspaceFeatures } from './features/router'
import { productionAgentTools } from './tools/composition'
import { productionGitHubWebhook } from './github/composition'
import { appFrameSources, runnerSoftware } from './configuration'
import { appSiteResponse } from './marketing/assets'

export function createApp(overrides: Partial<AppDependencies> = {}) {
  const dependencies: AppDependencies = {
    fetch: (request) => fetch(request),
    now: Date.now,
    randomToken,
    ...overrides,
  }
  const application = {
    async fetch(
      request: Request,
      env?: AppEnv,
      execution?: Pick<ExecutionContext, 'waitUntil'>,
    ): Promise<Response> {
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
        const origin = appOrigin(request, env)
        if (origin !== env.APP_ORIGIN) env = { ...env, APP_ORIGIN: origin }
        const surface = hostSurface(request, env)
        appApi = surface === 'app' && path.startsWith('/api/')
        if (surface === 'marketing') {
          return await marketingResponse(request, env, dependencies.now())
        }
        if (surface === 'preview')
          return respond(await routePreview(request, env, dependencies))
        if (surface === 'app') {
          checkOrigin(request, env)
          if (appApi && !upgrade) {
            const preflight = desktopPreflight(request)
            if (preflight) return privateResponse(preflight)
          }
          if (
            path === GITHUB_SETUP_PATH &&
            (request.method === 'GET' || request.method === 'HEAD') &&
            !upgrade
          ) {
            return respond(await githubSetupResponse(request, env))
          }
          if (!path.startsWith('/api/') && env.ASSETS) {
            const asset = path.startsWith(`/${SITE_FOLDER}/`)
              ? await appSiteResponse(request, env.ASSETS)
              : await env.ASSETS.fetch(request)
            const response = new Response(asset.body, asset)
            response.headers.set(
              'Content-Security-Policy',
              appContentSecurityPolicy(env.APP_ORIGIN, appFrameSources(env)),
            )
            return response
          }
        }
        if (surface === 'machine' && isDeviceMachinePath(path)) {
          return respond(await routeMacCommand(request, env))
        }
        if (surface === 'machine') {
          if (path === MACHINE_PATHS.workspaces)
            return respond(
              await productionAgentTools(request, env, dependencies),
            )
          if (path === MACHINE_PATHS.githubWebhook)
            return respond(
              await productionGitHubWebhook(request, env, dependencies),
            )
          if (path === MACHINE_PATHS.gitCredential) {
            const machineEnv = env
            const runtime = workspaceRuntime(
              {
                ...machineEnv,
                get WORKSPACES() {
                  return workspaceBinding(machineEnv)
                },
              },
              dependencies,
            )
            return respond(await handleGitCredential(request, runtime))
          }
          if (path === IMAGE_SOURCE_CREDENTIAL_PATH)
            return respond(await handleImageSourceCredential(request, env))
          const runnerResponse = await routeRunner(request, env)
          if (runnerResponse) return respond(runnerResponse)
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
        if (isDeviceAppPath(path))
          return respond(await routeDevice(request, env))
        const chatResponse = await routeChat(request, env)
        if (chatResponse) return respond(chatResponse)
        const featureResponse = await routeWorkspaceFeatures(request, env)
        if (featureResponse) return respond(featureResponse)
        const context = await membersGate(request, env, dependencies.now())
        return respond(
          await route(request, env, context, dependencies, execution),
        )
      } catch (error) {
        const response = errorResponse(error)
        if (path === API_PATHS.githubCallback) {
          response.headers.append('Set-Cookie', cookie(OAUTH_COOKIE, '', 0))
        }
        return respond(response)
      }
    },
  }
  return {
    fetch: requestBodyEntry(application.fetch),
    async scheduled(_event: ScheduledController, env: AppEnv): Promise<void> {
      await cleanupDeletedOrgs(
        env,
        dependencies,
        productionMembersHooks(env, dependencies),
      )
      await repairLifecycleAlarms(
        workspaceRuntime(env, dependencies),
        imageRuntime(env, dependencies),
        () => runnerSoftware(env),
      )
    },
  }
}

function healthResponse(): Response {
  return privateResponse(
    Response.json({ status: 'ok' } satisfies HealthResponse),
  )
}
