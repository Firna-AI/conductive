import type {
  PreviewResponse,
  PreviewsResponse,
} from '../../src/shared/previews'
import type { AppEnv } from '../env'
import { HttpError, privateResponse } from '../http'
import { requireRunning, toolError, toolRequest } from './access'
import { PrivatePorts } from './ports'
import { PreviewProxy } from './proxy'
import {
  expirePreviews,
  insertPreview,
  listPreviews,
  previewExpiry,
  publicPreview,
  revokePreview,
  revokeWorkspacePreviews,
} from './store'
import type { ToolDependencies } from './types'

function previewDomain(env: AppEnv): string {
  const domain = env.PREVIEW_DOMAIN?.toLowerCase()
  const appHost = new URL(env.APP_ORIGIN).hostname
  const appDomain = appHost.startsWith('app.') ? appHost.slice(4) : appHost
  if (
    !domain ||
    !/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(domain) ||
    domain === appDomain ||
    domain.endsWith(`.${appDomain}`) ||
    appDomain.endsWith(`.${domain}`)
  ) {
    throw new HttpError(
      503,
      'preview_unavailable',
      'The preview is not available. Try again.',
    )
  }
  return domain
}

/** Route wiring and Durable Object alarm ownership stay with the application. */
export function createPreviewHandler(
  env: AppEnv,
  dependencies: ToolDependencies,
) {
  const ports = new PrivatePorts(env, dependencies)
  const proxy = new PreviewProxy(env, dependencies, ports)
  return {
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
              previews: await listPreviews(env.DB, target, now),
            } satisfies PreviewsResponse),
          )
        }
        if (request.method === 'POST' && tail === null) {
          requireRunning(target)
          const port = context.body?.port
          if (
            typeof port !== 'number' ||
            !Number.isInteger(port) ||
            port < 1 ||
            port > 65535
          ) {
            throw new HttpError(
              400,
              'invalid_port',
              'Enter a port from 1 to 65535.',
            )
          }
          const domain = previewDomain(env)
          const descriptor = await ports.open(target, port, context.user.id)
          const label = Array.from(
            crypto.getRandomValues(new Uint8Array(16)),
            (byte) => byte.toString(16).padStart(2, '0'),
          ).join('')
          const row = {
            ...target,
            id: crypto.randomUUID(),
            hostname: `${label}.${domain}`,
            port,
            expiresAt: now + 86_400_000,
            listenerMode: descriptor.mode,
          }
          if (
            !(await insertPreview(env.DB, target, row, context.user.id, now))
          ) {
            throw new HttpError(
              409,
              'sandbox_not_ready',
              'Open the workspace to start its cloud computer.',
            )
          }
          return privateResponse(
            Response.json(
              { preview: publicPreview(row) } satisfies PreviewResponse,
              { status: 201 },
            ),
          )
        }
        if (request.method === 'DELETE' && tail) {
          await revokePreview(env.DB, target, tail, now)
          proxy.closePreview(target.workspaceId, tail)
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
