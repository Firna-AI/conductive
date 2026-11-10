import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { tokenWorkspace } from './queries'
import { sessionGate } from '../security/gate'

export async function routeRunner(
  request: Request,
  env: AppEnv,
): Promise<Response | null> {
  if (new URL(request.url).pathname !== MACHINE_PATHS.runner) return null
  const bearer = request.headers
    .get('Authorization')
    ?.match(/^Bearer (.+)$/i)?.[1]
  const workspace = bearer ? await tokenWorkspace(env.DB, bearer) : null
  if (!workspace)
    throw new HttpError(
      401,
      'workspace_token_required',
      'The connection is not available.',
    )
  return forwardWorkspaceRequest(request, env, workspace.id)
}

export async function routeChat(
  request: Request,
  env: AppEnv,
  now = Date.now(),
): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)\/(?:events|history|sessions(?:\/.*)?)$/,
  )
  if (!match) return null
  await sessionGate(request, env, now)
  let workspaceId: string
  try {
    workspaceId = decodeURIComponent(match[1])
  } catch {
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
  return forwardWorkspaceRequest(request, env, workspaceId)
}

/** @public The feature router forwards workspace requests through this boundary. */
export async function forwardWorkspaceRequest(
  request: Request,
  env: AppEnv,
  workspaceId: string,
): Promise<Response> {
  if (!env.WORKSPACES)
    throw new HttpError(
      503,
      'service_unavailable',
      'The app is not available. Try again.',
    )
  const response = await env.WORKSPACES.get(
    env.WORKSPACES.idFromName(workspaceId),
  ).fetch(request)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    ...(response.webSocket && { webSocket: response.webSocket }),
  })
}
