import type { AppDependencies, AppEnv } from '../env'
import { forwardWorkspaceRequest } from '../chat/router'
import { HttpError } from '../http'
import { createPreviewHandler } from '../previews/handler'
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
  const row = await env.DB.prepare(
    'SELECT workspace_id AS workspaceId FROM preview_hostnames WHERE hostname = ? AND revoked_at IS NULL AND expires_at > ?',
  )
    .bind(url.hostname, dependencies.now())
    .first<{ workspaceId: string }>()
  if (!row)
    throw new HttpError(
      404,
      'preview_not_found',
      'The preview is not available.',
    )
  return forwardWorkspaceRequest(request, env, row.workspaceId)
}
