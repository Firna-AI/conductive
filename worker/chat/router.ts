import type { AppEnv } from '../env'
import { HttpError } from '../http'

export async function routeChat(
  request: Request,
  env: AppEnv,
): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/api\/orgs\/[^/]+\/workspaces\/([^/]+)\/(?:events|history|sessions(?:\/.*)?)$/,
  )
  if (!match) return null
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
