import { saveOAuthState, saveSession, takeOAuthState } from '../data/users'
import type { AppDependencies, AppEnv } from '../env'
import { HttpError, isRecord } from '../http'
import { hash, sign, verify } from './crypto'
import {
  DESKTOP_CALLBACK,
  DESKTOP_ORIGIN,
  DESKTOP_SESSION_COOKIE,
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
  if (
    request.headers.get('Content-Type')?.split(';')[0] !== 'application/json'
  ) {
    throw new HttpError(415, 'json_required', 'Send the request as JSON.')
  }
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw invalidHandoff()
  }
  if (
    !isRecord(body) ||
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

export function desktopSessionCookie(value: string, seconds: number): string {
  return `${DESKTOP_SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${seconds}`
}

function invalidHandoff(): HttpError {
  return new HttpError(
    400,
    'invalid_desktop_handoff',
    'Sign-in expired. Start sign-in again.',
  )
}
