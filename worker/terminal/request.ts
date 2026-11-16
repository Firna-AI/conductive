import { API_PATHS } from '../../src/shared/api'
import { isTerminalId } from '../../src/shared/terminal'
import type { AppEnv } from '../env'
import { HttpError } from '../http'
import { workspaceTarget } from '../previews/access'
import { gate } from '../security/gate'

export type TerminalRoute =
  | { kind: 'state' }
  | { kind: 'socket' }
  | { kind: 'create' }
  | { kind: 'close'; terminalId: string }

function notFound(): never {
  throw new HttpError(404, 'not_found', 'The page is not available.')
}

export async function terminalRequest(
  request: Request,
  env: AppEnv,
  now: number,
) {
  const context = await gate(request, env, now)
  const path = new URL(request.url).pathname
  const match = path.match(
    new RegExp(
      `^${API_PATHS.orgs}/([^/]+)/workspaces/([^/]+)/terminal(?:/(socket|terminals)(?:/([^/]+))?)?$`,
    ),
  )
  if (!match) return notFound()
  let orgId: string
  let workspaceId: string
  let terminalId: string | undefined
  try {
    orgId = decodeURIComponent(match[1])
    workspaceId = decodeURIComponent(match[2])
    terminalId =
      match[4] === undefined ? undefined : decodeURIComponent(match[4])
  } catch {
    return notFound()
  }
  let route: TerminalRoute
  if (request.method === 'GET' && match[3] === undefined)
    route = { kind: 'state' }
  else if (
    request.method === 'GET' &&
    match[3] === 'socket' &&
    terminalId === undefined
  )
    route = { kind: 'socket' }
  else if (
    request.method === 'POST' &&
    match[3] === 'terminals' &&
    terminalId === undefined
  )
    route = { kind: 'create' }
  else if (
    request.method === 'DELETE' &&
    match[3] === 'terminals' &&
    isTerminalId(terminalId)
  )
    route = { kind: 'close', terminalId }
  else return notFound()
  const target = await workspaceTarget(env, orgId, workspaceId, context.user.id)
  return { context, target, route }
}
