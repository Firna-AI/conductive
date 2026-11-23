import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { AgentSessionResume } from '../../src/shared/generated/AgentSessionResume'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { startAcceptedMessage } from '../lifecycle/accepted-message-start'
import { lifecycleDependencies, workspaceRuntime } from '../lifecycle/runtime'
import { tokenWorkspace } from './queries'
import { record } from './inputs'
import { sessionGate } from '../security/gate'
import { attachmentRoute } from './attachment-routes'
import { recordUserActivity } from '../data/user-activity'

/** A chat message that the person sends, or sends again after a failure. */
const SENT_MESSAGE =
  /^\/api\/orgs\/[^/]+\/workspaces\/[^/]+\/sessions\/[^/]+\/(?:messages(?:\/[^/]+\/retry)?|explain)$/

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
  dependencies: Pick<AppDependencies, 'now' | 'randomToken'>,
  execution?: Pick<ExecutionContext, 'waitUntil'>,
): Promise<Response | null> {
  const { now } = dependencies
  const attachment = await attachmentRoute(
    request,
    env,
    now,
    dependencies.randomToken,
  )
  if (attachment) return attachment
  const path = new URL(request.url).pathname
  const match = path.match(
    /^\/api\/orgs\/([^/]+)\/workspaces\/([^/]+)\/(?:events|history|sessions(?:\/.*)?|secret-requests(?:\/[^/]+\/answer)?|secret-values\/[^/]+)$/,
  )
  if (!match) return null
  const person = await sessionGate(request, env, now())
  let workspaceId: string
  try {
    workspaceId = decodeURIComponent(match[2])
  } catch {
    throw new HttpError(
      404,
      'workspace_not_found',
      'The workspace is not available.',
    )
  }
  const response = await forwardWorkspaceRequest(request, env, workspaceId)
  if (request.method === 'POST' && response.ok && SENT_MESSAGE.test(path))
    await recordUserActivity(env.DB, person, now(), execution)
  if (request.method === 'POST' && response.ok && path.endsWith('/explain')) {
    const accepted = record(await response.json())
    const orgId = decodeURIComponent(match[1])
    let resume: AgentSessionResume
    try {
      const started = await startAcceptedMessage(
        workspaceRuntime(env, { ...lifecycleDependencies(), ...dependencies }),
        orgId,
        workspaceId,
        person.user.id,
      )
      resume = started.resume
    } catch (error) {
      if (!(error instanceof HttpError)) throw error
      resume = {
        state: 'failed',
        error: { code: error.code, message: error.message },
      }
    }
    const headers = new Headers(response.headers)
    headers.delete('Content-Length')
    return Response.json(
      { ...accepted, resume },
      { status: response.status, statusText: response.statusText, headers },
    )
  }
  return response
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
