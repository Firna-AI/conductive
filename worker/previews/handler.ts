import type {
  PreviewResponse,
  PreviewsResponse,
} from '../../src/shared/previews'
import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import { requireRunning, toolError, toolRequest } from './access'
import { previewLaunchPage, previewNativeLaunch } from './launch'
import { PrivatePorts } from './ports'
import { PreviewActions } from './actions'
import { PreviewProxy } from './proxy'
import {
  expirePreviews,
  previewExpiry,
  previewForLaunch,
  revokeWorkspacePreviews,
} from './store'
import type { ToolDependencies } from './types'

/** Route wiring and Durable Object alarm ownership stay with the application. */
export function createPreviewHandler(
  env: AppEnv,
  dependencies: ToolDependencies,
) {
  const ports = new PrivatePorts(env, dependencies)
  const proxy = new PreviewProxy(env, dependencies, ports)
  const actions = new PreviewActions(env, dependencies, ports, proxy)
  return {
    actions,
    fetch: async (request: Request): Promise<Response> => {
      try {
        const now = dependencies.now()
        const { context, target, tail } = await toolRequest(
          request,
          env,
          now,
          'previews',
        )
        if (request.method === 'GET' && tail === null) {
          return privateResponse(
            Response.json({
              previews: await actions.list(target, env.APP_ORIGIN, now),
            } satisfies PreviewsResponse),
          )
        }
        if (request.method === 'GET' && tail) {
          requireRunning(target)
          const row = await previewForLaunch(env.DB, target, tail, now)
          if (!row)
            throw new HttpError(
              404,
              'preview_not_found',
              'The preview is not available.',
            )
          const viewer = {
            userId: context.user.id,
            sessionId: context.sessionId,
          }
          return request.headers.get('Accept') === 'application/json'
            ? previewNativeLaunch(env, row, viewer, now)
            : previewLaunchPage(env, row, viewer, now)
        }
        if (request.method === 'POST' && tail === null) {
          return privateResponse(
            Response.json(
              {
                preview: await actions.open(
                  target,
                  context.user.id,
                  context.body?.port,
                  env.APP_ORIGIN,
                  now,
                ),
              } satisfies PreviewResponse,
              { status: 201 },
            ),
          )
        }
        if (request.method === 'DELETE' && tail) {
          await actions.close(target, tail, now)
          return privateResponse(new Response(null, { status: 204 }))
        }
        throw new HttpError(404, 'not_found', 'The page is not available.')
      } catch (error) {
        return toolError(error)
      }
    },
    proxy: (request: Request) => proxy.fetch(request),
    revokeWorkspace: async (workspaceId: string) => {
      await revokeWorkspacePreviews(env.DB, workspaceId, dependencies.now())
      proxy.closeWorkspace(workspaceId)
    },
    expire: async () => {
      await expirePreviews(env.DB, dependencies.now())
      proxy.expire()
    },
    nextExpiry: (workspaceId: string) => previewExpiry(env.DB, workspaceId),
  }
}
