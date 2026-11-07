import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import { TOOL_TURN_HEADER } from '../../tools/context'
import { HttpError, privateResponse } from '../http'
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
  const turnId = request.headers.get(TOOL_TURN_HEADER)
  if (!turnId)
    throw new HttpError(
      409,
      'current_turn_required',
      'Start an agent turn to use GitHub access.',
    )
  const senderId = await runtime
    .workspace(identity.workspaceId)
    .credentialSender(turnId)
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
