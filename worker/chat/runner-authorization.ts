import { MACHINE_PATHS } from '../../src/shared/agent-tools'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { tokenWorkspace } from './queries'

export async function authorizeChatRunner(env: AppEnv, request: Request) {
  const url = new URL(request.url)
  if (
    !env.MACHINE_ORIGIN ||
    url.origin !== env.MACHINE_ORIGIN ||
    url.pathname !== MACHINE_PATHS.runner
  )
    throw new HttpError(
      403,
      'machine_forbidden',
      'The connection is not available.',
    )
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
  return workspace
}
