import type { AppDependencies, AppEnv } from '../env'
import { forwardWorkspaceRequest } from '../chat/router'
import { HttpError } from '../http'
import { createPreviewHandler } from '../previews/handler'
import { previewHostnames } from '../previews/hostname-cache'
import { ServerTiming, SERVER_TIMING_HEADER } from '../server-timing'
import { featureWorkspaceId, isFeatureWorkspacePath } from './paths'
import { sessionGate } from '../security/gate'

export async function routeWorkspaceFeatures(
  request: Request,
  env: AppEnv,
  now = Date.now(),
): Promise<Response | null> {
  const path = new URL(request.url).pathname
  if (!isFeatureWorkspacePath(path)) return null
  await sessionGate(request, env, now)
  const id = featureWorkspaceId(path)
  return id === null ? null : forwardWorkspaceRequest(request, env, id)
}

export async function routePreview(
  request: Request,
  env: AppEnv,
  dependencies: AppDependencies,
): Promise<Response> {
  const url = new URL(request.url)
  if (url.hostname === `authorize.${env.PREVIEW_DOMAIN}`)
    return createPreviewHandler(env, dependencies).proxy(request)
  const timing = new ServerTiming()
  const now = dependencies.now()
  const cached = previewHostnames.get(url.hostname, now)
  if (cached) timing.add('lookup', 0)
  const workspaceId =
    cached ??
    (await timing.step('lookup', async () => {
      const row = await env.DB.prepare(
        'SELECT workspace_id AS workspaceId, expires_at AS expiresAt FROM preview_hostnames WHERE hostname = ? AND revoked_at IS NULL AND expires_at > ?',
      )
        .bind(url.hostname, now)
        .first<{ workspaceId: string; expiresAt: number }>()
      if (row)
        previewHostnames.set(url.hostname, row.workspaceId, row.expiresAt, now)
      return row?.workspaceId ?? null
    }))
  if (!workspaceId)
    throw new HttpError(
      404,
      'preview_not_found',
      'The preview is not available.',
    )
  const response = await timing.step('workspace', () =>
    forwardWorkspaceRequest(request, env, workspaceId),
  )
  // The workspace object times only a reply that passed every check. Keep that rule here.
  const steps = response.headers.get(SERVER_TIMING_HEADER)
  if (steps)
    response.headers.set(SERVER_TIMING_HEADER, `${timing.header()}, ${steps}`)
  return response
}
