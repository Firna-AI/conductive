import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { HttpError, isRecord, privateResponse } from '../http'
import { freshGitHubUserToken } from '../security/github-tokens'
import { requireOrgMember } from './access'
import { authenticateWorkspaceToken } from './tokens'
import type { WorkspaceRuntime } from './workspace-runtime'

/** The machine-host dispatcher calls this handler before browser routing. */
export async function handleGitCredential(
  request: Request,
  runtime: WorkspaceRuntime,
): Promise<Response> {
  if (
    !runtime.env.MACHINE_ORIGIN ||
    new URL(request.url).origin !== runtime.env.MACHINE_ORIGIN
  )
    throw new HttpError(
      403,
      'machine_origin_required',
      'The machine endpoint is not available.',
    )
  if (
    new URL(request.url).pathname !== MACHINE_PATHS.gitCredential ||
    request.method !== 'POST'
  )
    throw new HttpError(404, 'not_found', 'The page is not available.')
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer '))
    throw new HttpError(
      401,
      'workspace_token_refused',
      'The workspace token is not valid.',
    )
  const identity = await authenticateWorkspaceToken(
    runtime.env,
    authorization.slice(7),
  )
  if (
    request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  )
    throw new HttpError(415, 'json_required', 'Send the request as JSON.')
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new HttpError(400, 'invalid_json', 'The request is not valid JSON.')
  }
  if (!isRecord(body) || typeof body.turnId !== 'string' || !body.turnId)
    throw new HttpError(
      409,
      'current_turn_required',
      'Start an agent turn to use GitHub access.',
    )
  const senderId = await runtime
    .workspace(identity.workspaceId)
    .credentialSender(body.turnId)
  if (!senderId)
    throw new HttpError(
      409,
      'current_turn_required',
      'Start an agent turn to use GitHub access.',
    )
  await requireOrgMember(runtime.env.DB, identity.orgId, senderId)
  const token = await freshGitHubUserToken(
    runtime.env,
    senderId,
    runtime.dependencies,
  )
  return privateResponse(Response.json({ token }))
}
