import { saveOAuthState, saveSession, takeOAuthState } from '../data/users'
import { requireActiveUser } from '../data/user-access'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError } from '../http'
import { readJsonObject } from '../http/json-body'
import { hash, sign, verify } from './crypto'
import {
  DESKTOP_CALLBACK,
  DESKTOP_ORIGIN,
  desktopSessionCookie,
} from './desktop-contract'

const HANDOFF_SECONDS = 60
const SESSION_SECONDS = 7 * 24 * 60 * 60

export function desktopChallenge(request?: Request): string | undefined {
  const value =
    request && new URL(request.url).searchParams.get('desktop_challenge')
  if (!value) return undefined
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) throw invalidHandoff()
  return value
}

export async function createDesktopHandoff(
  challenge: string,
  userId: string,
  env: AppEnv,
  dependencies: AppDependencies,
): Promise<string> {
  const now = dependencies.now()
  const id = dependencies.randomToken()
  const expiresAt = now + HANDOFF_SECONDS * 1000
  await saveOAuthState(env.DB, await hash(`desktop:${id}`), expiresAt, now)
  const token = await sign(
    { id, userId, challenge, expiresAt },
    'desktop-handoff',
    env.SESSION_SIGNING_KEY,
  )
  return `${DESKTOP_CALLBACK}#token=${token}`
}

/** Only the app that holds the verifier can consume this one-use handoff. */
export async function finishDesktopSignIn(
  request: Request,
  env: AppEnv,
  dependencies: AppDependencies,
): Promise<Response> {
  if (request.headers.get('Origin') !== DESKTOP_ORIGIN) {
    throw new HttpError(403, 'origin_forbidden', 'Open the app to continue.')
  }
  let body: Record<string, unknown>
  try {
    body = await readJsonObject(request)
  } catch (error) {
    if (error instanceof HttpError && error.code === 'json_required')
      throw error
    throw invalidHandoff()
  }
  if (
    typeof body.token !== 'string' ||
    typeof body.verifier !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(body.verifier)
  )
    throw invalidHandoff()
  const now = dependencies.now()
  const handoff = await verify(
    body.token,
    'desktop-handoff',
    env.SESSION_SIGNING_KEY,
    now,
  )
  if (
    !handoff ||
    typeof handoff.id !== 'string' ||
    typeof handoff.userId !== 'string' ||
    handoff.challenge !== (await hash(body.verifier)) ||
    !(await takeOAuthState(env.DB, await hash(`desktop:${handoff.id}`), now))
  )
    throw invalidHandoff()
  const sessionId = dependencies.randomToken()
  const expiresAt = now + SESSION_SECONDS * 1000
  await requireActiveUser(env.DB, handoff.userId)
  await saveSession(env.DB, sessionId, handoff.userId, expiresAt, now)
  const session = await sign(
    { sessionId, expiresAt },
    'session',
    env.SESSION_SIGNING_KEY,
  )
  return new Response(null, {
    status: 204,
    headers: { 'Set-Cookie': desktopSessionCookie(session, SESSION_SECONDS) },
  })
}

function invalidHandoff(): HttpError {
  return new HttpError(
    400,
    'invalid_desktop_handoff',
    'Sign-in expired. Start sign-in again.',
  )
}
