import { API_PATHS, type Org, type User } from '../../src/shared/api'
import { findMembership } from '../data/orgs'
import { sessionUser } from '../data/users'
import type { AppEnv } from '../env'
import { HttpError, isRecord } from '../http'
import { readCookie, SESSION_COOKIE } from './cookies'
import { verify } from './crypto'

export interface RequestContext {
  user: User
  sessionId: string
  org: Org | null
  body: Record<string, unknown> | null
}

export function checkHost(request: Request, env: AppEnv): void {
  if (new URL(request.url).origin !== env.APP_ORIGIN) {
    throw new HttpError(403, 'origin_forbidden', 'Open the app to continue.')
  }
}

export function checkOrigin(
  request: Request,
  env: AppEnv,
  navigation = false,
): void {
  const origin = request.headers.get('Origin')
  if (origin !== env.APP_ORIGIN && !(navigation && origin === null)) {
    throw new HttpError(403, 'origin_forbidden', 'Open the app to continue.')
  }
}

export async function gate(
  request: Request,
  env: AppEnv,
  now: number,
): Promise<RequestContext> {
  checkHost(request, env)
  checkOrigin(request, env)
  const token = readCookie(request, SESSION_COOKIE)
  const session = token
    ? await verify(token, 'session', env.SESSION_SIGNING_KEY, now)
    : null
  const sessionId = session?.sessionId
  const user =
    typeof sessionId === 'string'
      ? await sessionUser(env.DB, sessionId, now)
      : null
  if (!user || typeof sessionId !== 'string') {
    throw new HttpError(
      401,
      'sign_in_required',
      'Sign in with GitHub to continue.',
    )
  }
  const path = new URL(request.url).pathname
  const match = path.match(new RegExp(`^${API_PATHS.orgs}/([^/]+)(?:/|$)`))
  let org: Org | null = null
  if (match) {
    let orgId: string
    try {
      orgId = decodeURIComponent(match[1])
    } catch {
      throw new HttpError(404, 'org_not_found', 'The org is not available.')
    }
    org = await findMembership(env.DB, orgId, user.id)
    if (!org)
      throw new HttpError(404, 'org_not_found', 'The org is not available.')
  }
  let body: Record<string, unknown> | null = null
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const contentType = request.headers
      .get('Content-Type')
      ?.split(';')[0]
      .trim()
      .toLowerCase()
    if (contentType !== 'application/json') {
      throw new HttpError(415, 'json_required', 'Send the request as JSON.')
    }
    let value: unknown
    try {
      value = await request.json()
    } catch {
      throw new HttpError(400, 'invalid_json', 'The request is not valid JSON.')
    }
    if (!isRecord(value)) {
      throw new HttpError(400, 'invalid_json', 'Send a JSON object.')
    }
    body = value
  }
  return { user, sessionId, org, body }
}
